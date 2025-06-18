# 🌐 Preswald: AI-Powered CSV Analytics Assistant

Preswald is an intelligent, browser-based CSV analytics assistant built for real-time, interactive data exploration. It allows users to upload CSV files, auto-profiles the dataset, answers natural language questions, and even generates Python visualizations — all without installing Python locally.

This project was built as part of the **Preswald Hackathon 2025** to showcase the power of **in-browser computation**, **LLM integration**, and **interactive data visualization**.

---

## 📌 Table of Contents

- [🔍 Problem Statement](#-problem-statement)
- [🎯 Features](#-features)
- [🧠 Project Architecture](#-project-architecture)
- [🧰 Tech Stack](#-tech-stack)
- [🚀 Setup Instructions](#-setup-instructions)
- [🌐 Usage Guide](#-usage-guide)
- [📊 Example Use Cases](#-example-use-cases)
- [📁 Project Structure](#-project-structure)
- [📸 Screenshots](#-screenshots)
- [🔐 License](#-license)
- [👨‍💻 Team and Credits](#-team-and-credits)

---

## 🔍 Problem Statement

Non-technical users often struggle to extract insights from raw CSV data. Running Python scripts, generating plots, or asking questions about their data requires coding knowledge, software setup, and debugging skills.

**Preswald solves this** by:
- Bringing a full Python interpreter into the browser using Pyodide.
- Letting users ask questions in natural language.
- Leveraging LLMs (like Mistral via Ollama) to generate Python code and insights automatically.
- Rendering visualizations directly in the browser.

---

## 🎯 Features

✅ Drag & drop CSV upload  
✅ Dataset profiling (rows, columns, missing values, data types)  
✅ Auto-generated histograms and bar plots  
✅ Natural language chat interface to ask questions  
✅ Backend LLM (Mistral) generates Python code to answer queries  
✅ Code runs **in-browser** using Pyodide (no backend execution)  
✅ Interactive chat history with formatted responses  
✅ Easy-to-deploy, lightweight, self-contained app  

---

## 🧠 Project Architecture

```mermaid
flowchart TD
  A[User Uploads CSV] --> B[Frontend (React + Pyodide)]
  B --> C[Dataset Profiling using Pandas]
  B --> D[Auto-generate plots using Matplotlib]
  B --> E[Ask Question in Chat]
  E --> F[Backend Flask Server]
  F --> G[Ollama + Mistral LLM]
  G --> H[Generate Python code + answer]
  H --> I[Return to Frontend]
  I --> J[Render Plot in Browser using Pyodide]
