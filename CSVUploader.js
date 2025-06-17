import React, { useState, useEffect } from "react";
import Plotly from "plotly.js-dist";

const CSVUploader = () => {
  const [csvFile, setCsvFile] = useState(null);
  const [dataFrameInfo, setDataFrameInfo] = useState(null);
  const [missingValues, setMissingValues] = useState([]);
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [codeOutput, setCodeOutput] = useState("");
  const [chartDivId] = useState("generated-chart");

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
    if (!csvFile) return;
    const pyodide = await window.pyodide;
    const reader = new FileReader();

    reader.onload = async (e) => {
      const csvData = e.target.result;
      try {
        pyodide.runPython(`
          import pandas as pd
          from io import StringIO
          csv_data = '''${csvData}'''
          df = pd.read_csv(StringIO(csv_data))
          df_info = {
            "rows": df.shape[0],
            "columns": df.shape[1],
            "column_types": df.dtypes.astype(str).to_dict(),
            "missing_values": df.isnull().sum().to_dict()
          }
        `);

        const dfInfo = pyodide.globals.get("df_info").toJs();
        setDataFrameInfo(dfInfo);

        const missingValuesArray = Object.entries(dfInfo.missing_values).map(
          ([col, count]) => ({ column: col, count })
        );
        setMissingValues(missingValuesArray);

        Plotly.newPlot("missing-values-chart", [
          {
            x: missingValuesArray.map((item) => item.column),
            y: missingValuesArray.map((item) => item.count),
            type: "bar",
          },
        ]);
      } catch (error) {
        console.error("Error processing CSV:", error);
      }
    };

    reader.readAsText(csvFile);
  };

  const handleQuestionSubmit = async () => {
    if (!question || !dataFrameInfo) return;
    const pyodide = await window.pyodide;

    const csvHead = pyodide.runPython(`df.head(50).to_json(orient="split")`);
    const payload = {
      question,
      data_sample: JSON.parse(csvHead),
    };

    try {
      const res = await fetch("/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.text();
      setResponse(result);

      const codeMatch = result.match(/```python\n([\s\S]+?)```/);
      if (codeMatch) {
        setCodeOutput(codeMatch[1]);
      } else {
        setCodeOutput("");
      }
    } catch (error) {
      console.error("Error sending question to backend:", error);
    }
  };

  const runGeneratedCode = async () => {
    if (!codeOutput) return;
    const pyodide = await window.pyodide;

    try {
      const chartContainer = document.getElementById(chartDivId);
      chartContainer.innerHTML = "";

      pyodide.runPython(`
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from io import StringIO

${codeOutput}

plt.tight_layout()
plt.savefig("/mnt/data/chart.png")
`);
      const img = document.createElement("img");
      img.src = "/pyodide/chart.png";
      img.alt = "Generated Chart";
      img.style.maxWidth = "100%";
      chartContainer.appendChild(img);
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
          <p><strong>Rows:</strong> {dataFrameInfo.rows}</p>
          <p><strong>Columns:</strong> {dataFrameInfo.columns}</p>
          <h4>Columns and Data Types</h4>
          <ul>
            {Object.entries(dataFrameInfo.column_types).map(([col, type]) => (
              <li key={col}>{col}: {type}</li>
            ))}
          </ul>
          <h4>Missing Values</h4>
          <ul>
            {missingValues.map(({ column, count }) => (
              <li key={column}>{column}: {count}</li>
            ))}
          </ul>
          <div id="missing-values-chart" style={{ width: "100%", height: "400px" }}></div>
        </div>
      )}

      <div>
        <h3>Ask a Question</h3>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows="4"
          cols="50"
          placeholder="Type a natural-language question here..."
        />
        <br />
        <button onClick={handleQuestionSubmit}>Ask</button>
      </div>

      {response && (
        <div>
          <h3>LLM Response</h3>
          <pre>{response}</pre>
        </div>
      )}

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
