import os
import streamlit as st
from dotenv import load_dotenv
from rag import load_data, chunk_documents, create_vector_store, get_retriever, query_rag

# Load environment variables
load_dotenv()

# Streamlit Page Configuration
st.set_page_config(
    page_title="TechMart AI Assistant — Company Knowledge Base",
    page_icon="💼",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling
st.markdown("""
<style>
    .main-header {
        font-size: 2.2rem;
        font-weight: 700;
        color: #1E3A8A;
        margin-bottom: 0.2rem;
    }
    .sub-header {
        font-size: 1.05rem;
        color: #4B5563;
        margin-bottom: 1.5rem;
    }
    .badge {
        display: inline-block;
        padding: 0.25em 0.6em;
        font-size: 80%;
        font-weight: 600;
        border-radius: 0.375rem;
        background-color: #E0E7FF;
        color: #3730A3;
        margin-right: 0.5rem;
    }
</style>
""", unsafe_allow_html=True)


@st.cache_resource(show_spinner=False)
def initialize_rag_system(provider: str, api_key: str):
    """
    Loads data once at app startup, chunks documents, embeds them,
    and returns the FAISS vector store and retriever.
    Cached so it does NOT reload on every query.
    """
    # 1. Load data from local TXT and Excel files
    docs = load_data(data_dir="data")
    if not docs:
        raise ValueError("No documents found in data/ directory. Ensure .txt or .xlsx files are present.")

    # 2. Chunk documents (chunk_size=500, overlap=50)
    chunks = chunk_documents(docs, chunk_size=500, chunk_overlap=50)

    # 3. Create FAISS vector store with Embeddings
    vectorstore = create_vector_store(chunks, provider=provider, api_key=api_key)

    # 4. Create retriever with top-3 chunk retrieval
    retriever = get_retriever(vectorstore, k=3)

    return {
        "docs": docs,
        "chunks": chunks,
        "vectorstore": vectorstore,
        "retriever": retriever
    }


def main():
    st.markdown('<div class="main-header">🏢 TechMart Company Knowledge Chatbot</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="sub-header">Ask questions about company policies, product catalog, pricing, and warranty. '
        'Answers are strictly grounded in company data.</div>',
        unsafe_allow_html=True
    )

    # Sidebar
    with st.sidebar:
        st.header("⚙️ Configuration & Status")

        # Provider Selection
        provider_choice = st.radio(
            "AI Provider",
            options=["Google Gemini (Free)", "OpenAI"],
            index=0,
            help="Choose Google Gemini for the free tier, or OpenAI if you have prepaid API credits."
        )

        is_gemini = "Google Gemini" in provider_choice
        provider = "gemini" if is_gemini else "openai"

        if is_gemini:
            secret_key = ""
            try:
                secret_key = st.secrets.get("GOOGLE_API_KEY", "") or st.secrets.get("GEMINI_API_KEY", "")
            except Exception:
                pass
            default_key = secret_key or os.getenv("GOOGLE_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")
            key_label = "Google AI (Gemini) API Key"
            key_help = "Get your free API key at: https://aistudio.google.com/"
            model_options = ["gemini-flash-lite-latest", "gemini-flash-latest"]
        else:
            secret_key = ""
            try:
                secret_key = st.secrets.get("OPENAI_API_KEY", "")
            except Exception:
                pass
            default_key = secret_key or os.getenv("OPENAI_API_KEY", "")
            key_label = "OpenAI API Key"
            key_help = "Enter your paid OpenAI API key."
            model_options = ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"]

        api_key_input = st.text_input(
            key_label,
            value=default_key,
            type="password",
            help=key_help
        )

        active_api_key = api_key_input.strip() if api_key_input.strip() else default_key

        model_name = st.selectbox(
            "Model",
            options=model_options,
            index=0,
            help="Select the LLM model to generate answers."
        )

        st.divider()

        # Reload / Clear Cache button
        if st.button("🔄 Reload & Re-index Data", use_container_width=True):
            st.cache_resource.clear()
            st.session_state.messages = []
            st.success("Cache cleared! Reloading...")
            st.rerun()

        # Chat history reset
        if st.button("🗑️ Clear Chat History", use_container_width=True):
            st.session_state.messages = []
            st.rerun()

        st.divider()

        st.markdown("### 📁 Local Data Files")
        data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
        if os.path.exists(data_dir):
            files = os.listdir(data_dir)
            for f in files:
                if f.endswith(".txt"):
                    st.markdown(f"📄 `{f}` *(TextLoader)*")
                elif f.endswith(".xlsx"):
                    st.markdown(f"📊 `{f}` *(Excel Loader)*")
        else:
            st.warning("`data/` folder not found!")

    # Guard: Check API key
    if not active_api_key:
        provider_name = "Google Gemini" if is_gemini else "OpenAI"
        st.info(f"👋 Please enter your **{provider_name} API Key** in the sidebar to start chatting.")
        if is_gemini:
            st.caption("Don't have one? Get a free key in 10 seconds at [Google AI Studio](https://aistudio.google.com/).")
        st.stop()

    # Initialize RAG System (runs once at startup and is cached)
    with st.spinner("Indexing company documents at startup..."):
        try:
            rag_data = initialize_rag_system(provider=provider, api_key=active_api_key)
        except Exception as e:
            st.error(f"Error initializing RAG system: {e}")
            st.stop()

    # Show status badges in sidebar
    with st.sidebar:
        st.markdown("### 📊 Index Statistics")
        st.metric("Total Documents Loaded", len(rag_data["docs"]))
        st.metric("Total Chunks Created", len(rag_data["chunks"]))
        st.caption("Top-3 relevant chunks retrieved per query.")

    # Initialize session state for messages
    if "messages" not in st.session_state:
        st.session_state.messages = [
            {
                "role": "assistant",
                "content": "Hello! I am your company assistant. Ask me anything about our policies, shipping, returns, or product catalog.",
                "sources": []
            }
        ]

    # Display existing chat messages
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
            if msg.get("sources"):
                with st.expander("🔍 View Retrieved Chunks (Top 3)"):
                    for idx, doc in enumerate(msg["sources"], 1):
                        source_file = doc.metadata.get("source_file", "Unknown")
                        st.markdown(f"**Chunk {idx}** *(Source: `{source_file}`)*:")
                        st.code(doc.page_content.strip(), language="text")

    # Chat Input
    if user_question := st.chat_input("Ask a question (e.g., 'What is the return policy for electronics?', 'Do we sell MacBook?')"):
        # Display user message
        st.session_state.messages.append({"role": "user", "content": user_question, "sources": []})
        with st.chat_message("user"):
            st.markdown(user_question)

        # Generate response using RAG
        with st.chat_message("assistant"):
            with st.spinner("Searching company documents..."):
                try:
                    answer, retrieved_docs = query_rag(
                        question=user_question,
                        retriever=rag_data["retriever"],
                        provider=provider,
                        api_key=active_api_key,
                        model_name=model_name
                    )

                    st.markdown(answer)

                    if retrieved_docs:
                        with st.expander("🔍 View Retrieved Chunks (Top 3)"):
                            for idx, doc in enumerate(retrieved_docs, 1):
                                source_file = doc.metadata.get("source_file", "Unknown")
                                st.markdown(f"**Chunk {idx}** *(Source: `{source_file}`)*:")
                                st.code(doc.page_content.strip(), language="text")

                    # Save assistant response to session state
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": answer,
                        "sources": retrieved_docs
                    })

                except Exception as err:
                    err_msg = f"An error occurred while answering: {err}"
                    st.error(err_msg)
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": err_msg,
                        "sources": []
                    })


if __name__ == "__main__":
    main()
