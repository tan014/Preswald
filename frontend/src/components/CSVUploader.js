import React, { useState, useEffect } from "react";
import Plotly from "plotly.js-dist";

const CSVUploader = () => {
  const [csvFile, setCsvFile] = useState(null);
  const [dataFrameInfo, setDataFrameInfo] = useState(null);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [codeOutput, setCodeOutput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chartDivId] = useState("generated-chart");

  useEffect(() => {
    const loadPyodide = async () => {
      if (!window.pyodide) {
        console.log("Loading Pyodide...");
        window.pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/",
        });
        console.log("✅ Pyodide loaded.");
      }
    };
    loadPyodide();
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) setCsvFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) setCsvFile(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const processCSV = async () => {
    if (!csvFile || !window.pyodide) return;
    const pyodide = window.pyodide;
    await pyodide.loadPackage(["pandas", "numpy", "matplotlib"]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvData = e.target.result;
      try {
        pyodide.FS.writeFile("uploaded.csv", csvData);

        await pyodide.runPythonAsync(`
import pandas as pd
import matplotlib.pyplot as plt
from io import BytesIO
import base64

df = pd.read_csv("uploaded.csv")
df_info = {
    "rows": df.shape[0],
    "columns": df.shape[1],
    "column_types": df.dtypes.astype(str).to_dict(),
    "missing_values": df.isnull().sum().to_dict(),
    "plots": {}
}

for col in df.columns:
    try:
        plt.figure(figsize=(6, 4))
        if pd.api.types.is_numeric_dtype(df[col]):
            plt.hist(df[col].dropna(), bins=30)
            plt.title(f"Histogram of {col}")
        elif df[col].nunique() <= 10:
            df[col].value_counts().plot(kind="barh")
            plt.title(f"Bar Chart of {col}")
        else:
            continue
        buf = BytesIO()
        plt.tight_layout()
        plt.savefig(buf, format="png")
        plt.close()
        buf.seek(0)
        df_info["plots"][col] = "data:image/png;base64," + base64.b64encode(buf.read()).decode("utf-8")
    except:
        pass
        `);

        const dfInfo = pyodide.globals.get("df_info").toJs();
        setDataFrameInfo(dfInfo);

        const chartDiv = document.getElementById("missing-values-chart");
        if (chartDiv && dfInfo.get("missing_values")) {
          const missingValues = Array.from(dfInfo.get("missing_values").entries());
          Plotly.newPlot(chartDiv, [
            {
              x: missingValues.map(([col]) => col),
              y: missingValues.map(([_, count]) => count),
              type: "bar",
            },
          ]);
        }
      } catch (error) {
        console.error("🔥 Pyodide error:", error);
      }
    };

    reader.readAsText(csvFile);
  };

  const handleQuestionSubmit = async () => {
    if (!question || !dataFrameInfo || !window.pyodide) return;
    const pyodide = window.pyodide;

    try {
      const csvHead = pyodide.runPython(`df.head(50).to_json(orient="split")`);
      const payload = {
        question,
        data_sample: JSON.parse(csvHead),
      };

      // Append user question to chat history
      setChatHistory((prev) => [...prev, { role: "user", content: question }]);
      setQuestion("");

      const res = await fetch("http://10.200.225.226:5000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      const resultText = result?.response || "No response from backend";
      setResponse(resultText);

      // Append LLM response to chat history
      setChatHistory((prev) => [...prev, { role: "assistant", content: resultText }]);

      const codeMatch = resultText.match(/```python\n([\s\S]+?)```/);
      if (codeMatch) {
        setCodeOutput(codeMatch[1]);
      } else {
        setCodeOutput("");
      }
    } catch (error) {
      console.error("Error in Q&A:", error);
    }
  };

  const runGeneratedCode = async () => {
    if (!codeOutput || !window.pyodide) return;
    const pyodide = window.pyodide;

    try {
      const chartContainer = document.getElementById(chartDivId);
      if (chartContainer) chartContainer.innerHTML = "";

      pyodide.FS.mkdir("/mnt/data");
      pyodide.FS.mount(pyodide.FS.filesystems.MEMFS, {}, "/mnt/data");

      pyodide.runPython(`
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

${codeOutput}

plt.tight_layout()
plt.savefig("/mnt/data/chart.png")
      `);

      const pngBytes = pyodide.FS.readFile("/mnt/data/chart.png");
      const blob = new Blob([pngBytes], { type: "image/png" });
      const url = URL.createObjectURL(blob);

      const img = document.createElement("img");
      img.src = url;
      img.alt = "Generated Chart";
      img.style.maxWidth = "100%";
      if (chartContainer) chartContainer.appendChild(img);
    } catch (err) {
      alert("Error running generated Python code: " + err);
    }
  };

  useEffect(() => {
    if (csvFile) processCSV();
  }, [csvFile]);

  return (
    <div>
      <h2>CSV File Uploader</h2>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          border: "2px dashed gray",
          padding: "20px",
          marginBottom: "20px",
          textAlign: "center",
        }}
      >
        Drag and drop a CSV file here, or{" "}
        <input type="file" accept=".csv" onChange={handleFileUpload} />
      </div>

      {dataFrameInfo && (
        <div>
          <h3>Dataset Summary</h3>
          <p><strong>Rows:</strong> {dataFrameInfo.get("rows")}</p>
          <p><strong>Columns:</strong> {dataFrameInfo.get("columns")}</p>

          <h4>Columns and Data Types</h4>
          <ul>
            {Array.from(dataFrameInfo.get("column_types").entries()).map(([col, type]) => (
              <li key={col}>{col}: {type}</li>
            ))}
          </ul>

          <h4>Missing Values</h4>
          <ul>
            {Array.from(dataFrameInfo.get("missing_values").entries()).map(([col, count]) => (
              <li key={col}>{col}: {count}</li>
            ))}
          </ul>

          <div id="missing-values-chart" style={{ width: "100%", height: "400px" }}></div>

          <h4>Auto Plots</h4>
          {Array.from(dataFrameInfo.get("plots").entries()).map(([col, img]) => (
            <div key={col}>
              <h5>{col}</h5>
              <img src={img} alt={`Plot for ${col}`} style={{ maxWidth: "100%", marginBottom: "20px" }} />
            </div>
          ))}
        </div>
      )}

      <div>
        <h3>Chat History</h3>
        <div style={{
          maxHeight: "300px",
          overflowY: "auto",
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "5px",
          backgroundColor: "#f9f9f9",
          marginBottom: "15px"
        }}>
          {chatHistory.map((msg, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: "10px",
                textAlign: msg.role === "user" ? "right" : "left"
              }}
            >
              <strong>{msg.role === "user" ? "You" : "Assistant"}:</strong>
              <div
                style={{
                  display: "inline-block",
                  maxWidth: "80%",
                  backgroundColor: msg.role === "user" ? "#d1e7dd" : "#e2e3e5",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  marginTop: "4px"
                }}
              >
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{msg.content}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows="3"
          cols="50"
          placeholder="Ask something about the data..."
        />
        <br />
        <button onClick={handleQuestionSubmit}>Ask</button>
      </div>

      {codeOutput && (
        <div>
          <h3>Generated Python Code</h3>
          <pre>{codeOutput}</pre>
          <button onClick={runGeneratedCode}>Run This Code</button>
          <div id={chartDivId} style={{ marginTop: "20px" }}></div>
        </div>
      )}
    </div>
  );
};

export default CSVUploader;
