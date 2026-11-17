import os
import glob
from typing import List, Tuple
import requests
from dotenv import load_dotenv

# LangChain Document Loaders
from langchain_community.document_loaders import TextLoader, UnstructuredExcelLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.embeddings import Embeddings

# Vector Store and Embeddings
from langchain_community.vectorstores import FAISS

# Load environment variables
load_dotenv()


class GoogleGeminiEmbeddings(Embeddings):
    """
    Lightweight LangChain-compatible embeddings using Google Gemini REST API.
    Uses models/gemini-embedding-001 which is available on Google AI Studio Free Tier.
    """
    def __init__(self, api_key: str, model: str = "models/gemini-embedding-001"):
        self.api_key = api_key
        self.model = model

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        embeddings = []
        for text in texts:
            embeddings.append(self.embed_query(text))
        return embeddings

    def embed_query(self, text: str) -> List[float]:
        # Clean text
        clean_text = text.strip() or "empty"
        url = f"https://generativelanguage.googleapis.com/v1beta/{self.model}:embedContent?key={self.api_key}"
        payload = {
            "content": {"parts": [{"text": clean_text}]}
        }
        res = requests.post(url, json=payload, timeout=30)
        if res.status_code != 200:
            raise ValueError(f"Google Gemini Embedding error ({res.status_code}): {res.text}")
        return res.json()["embedding"]["values"]


def load_data(data_dir: str = "data") -> List[Document]:
    """
    Loads company data from local .txt and .xlsx files.
    - Uses TextLoader for .txt files
    - Uses UnstructuredExcelLoader (with openpyxl/pandas fallback) for .xlsx files
    Combines all loaded documents.
    """
    if not os.path.isabs(data_dir):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(base_dir, data_dir)

    all_docs: List[Document] = []

    # 1. Load .txt files
    txt_files = glob.glob(os.path.join(data_dir, "*.txt"))
    for txt_file in txt_files:
        try:
            loader = TextLoader(txt_file, encoding="utf-8")
            loaded = loader.load()
            for doc in loaded:
                doc.metadata["source_file"] = os.path.basename(txt_file)
                doc.metadata["file_type"] = "txt"
            all_docs.extend(loaded)
        except Exception as e:
            print(f"Error loading TXT file {txt_file}: {e}")

    # 2. Load .xlsx files
    xlsx_files = glob.glob(os.path.join(data_dir, "*.xlsx"))
    for xlsx_file in xlsx_files:
        excel_loaded = False
        try:
            loader = UnstructuredExcelLoader(xlsx_file, mode="elements")
            loaded = loader.load()
            if loaded:
                for doc in loaded:
                    doc.metadata["source_file"] = os.path.basename(xlsx_file)
                    doc.metadata["file_type"] = "xlsx"
                all_docs.extend(loaded)
                excel_loaded = True
        except Exception:
            try:
                loader = UnstructuredExcelLoader(xlsx_file)
                loaded = loader.load()
                if loaded:
                    for doc in loaded:
                        doc.metadata["source_file"] = os.path.basename(xlsx_file)
                        doc.metadata["file_type"] = "xlsx"
                    all_docs.extend(loaded)
                    excel_loaded = True
            except Exception:
                pass

        # Fallback using openpyxl & pandas to ensure 100% reliable excel parsing
        if not excel_loaded:
            try:
                import pandas as pd
                df = pd.read_excel(xlsx_file, engine="openpyxl")
                for index, row in df.iterrows():
                    row_items = [f"{col}: {val}" for col, val in row.items() if pd.notna(val)]
                    content = "\n".join(row_items)
                    doc = Document(
                        page_content=content,
                        metadata={
                            "source_file": os.path.basename(xlsx_file),
                            "file_type": "xlsx",
                            "row": index
                        }
                    )
                    all_docs.append(doc)
            except Exception as e_excel:
                print(f"Error loading Excel file {xlsx_file}: {e_excel}")

    return all_docs


def chunk_documents(documents: List[Document], chunk_size: int = 500, chunk_overlap: int = 50) -> List[Document]:
    """
    Chunks all documents using RecursiveCharacterTextSplitter.
    Default: chunk_size=500, chunk_overlap=50.
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""]
    )
    return text_splitter.split_documents(documents)


def create_vector_store(chunks: List[Document], provider: str = "gemini", api_key: str = None) -> FAISS:
    """
    Embeds chunks and stores them in FAISS vector store.
    Supports:
    - provider="gemini" (Google Gemini Free)
    - provider="openai" (OpenAI Paid)
    """
    if provider == "gemini":
        key = api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not key:
            raise ValueError("Google Gemini API key is missing. Please set GOOGLE_API_KEY in .env or app.")
        embeddings = GoogleGeminiEmbeddings(api_key=key, model="models/gemini-embedding-001")
    else:
        from langchain_openai import OpenAIEmbeddings
        key = api_key or os.getenv("OPENAI_API_KEY")
        if not key:
            raise ValueError("OpenAI API key is missing. Please set OPENAI_API_KEY in .env.")
        embeddings = OpenAIEmbeddings(openai_api_key=key)

    vectorstore = FAISS.from_documents(chunks, embeddings)
    return vectorstore


def get_retriever(vectorstore: FAISS, k: int = 3):
    """
    Returns a retriever configured to fetch the top-k relevant chunks per question.
    """
    return vectorstore.as_retriever(search_kwargs={"k": k})


PROMPT_TEMPLATE = """You are a helpful and knowledgeable company AI assistant.
Answer the user's question using ONLY the provided context below.

STRICT RULES:
1. If the answer is not in the data or cannot be clearly determined from the provided context, respond with: "I don't know."
2. Do NOT speculate, infer, or make up any information outside of what is explicitly stated in the context.
3. Keep answers clear, accurate, and concise.

Context:
{context}

Question:
{question}

Answer:"""


def query_rag(
    question: str,
    retriever,
    provider: str = "gemini",
    api_key: str = None,
    model_name: str = "gemini-flash-lite-latest",
    temperature: float = 0.0
) -> Tuple[str, List[Document]]:
    """
    Retrieves top-3 relevant chunks and queries the LLM (Gemini or OpenAI) to answer grounded in company data only.
    Returns:
        (answer_text, retrieved_documents)
    """
    # 1. Retrieve top relevant chunks (k=3)
    docs = retriever.invoke(question)

    if not docs:
        return "I don't know.", []

    # 2. Format context
    context_text = "\n\n---\n\n".join([doc.page_content for doc in docs])
    full_prompt = PROMPT_TEMPLATE.format(context=context_text, question=question)

    # 3. LLM Generation
    if provider == "gemini":
        key = api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not key:
            raise ValueError("Google Gemini API key is missing.")

        models_to_try = [model_name, "gemini-flash-lite-latest", "gemini-flash-latest"]
        last_error = None
        for m in dict.fromkeys(models_to_try):
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={key}"
            payload = {
                "contents": [{"parts": [{"text": full_prompt}]}],
                "generationConfig": {"temperature": temperature}
            }
            res = requests.post(url, json=payload, timeout=60)
            if res.status_code == 200:
                data = res.json()
                try:
                    answer = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    return answer, docs
                except Exception:
                    return "I don't know.", docs
            else:
                last_error = f"Gemini API error ({res.status_code}): {res.text}"

        raise ValueError(last_error or "Failed to generate answer from Gemini.")

    else:
        from langchain_openai import ChatOpenAI
        from langchain_core.prompts import ChatPromptTemplate
        from langchain_core.output_parsers import StrOutputParser

        key = api_key or os.getenv("OPENAI_API_KEY")
        if not key:
            raise ValueError("OpenAI API key is missing.")

        llm = ChatOpenAI(
            model=model_name or "gpt-4o-mini",
            temperature=temperature,
            openai_api_key=key
        )
        prompt = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
        chain = prompt | llm | StrOutputParser()

        response = chain.invoke({
            "context": context_text,
            "question": question
        })
        return response.strip(), docs
