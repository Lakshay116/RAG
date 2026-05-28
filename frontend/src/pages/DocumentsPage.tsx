import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { CapabilityGate } from "../components/RouteGuards";
import { Card } from "../components/Card";

interface DocumentItem {
  id: string;
  fileName: string;
  createdAt: string;
}

export function DocumentsPage() {
  const { user, token } = useAuth();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [fileName, setFileName] = useState("policy.txt");
  const [content, setContent] = useState("Refunds are allowed within 30 days with receipt.");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState("");
  const [message, setMessage] = useState("");

  async function loadDocs() {
    try {
      const res = await api.listDocuments(user!.tenantId, token!);
      setDocs(res.documents.map((d) => ({ id: d.id, fileName: d.fileName, createdAt: d.createdAt })));
    } catch (err) {
      setMessage(`Error: ${(err as Error).message}`);
    }
  }

  useEffect(() => {
    void loadDocs();
  }, []);

  async function upload(e: FormEvent) {
    e.preventDefault();
    try {
      await api.uploadDocument(user!.tenantId, token!, { fileName, content });
      setMessage("Document uploaded");
      await loadDocs();
    } catch (err) {
      setMessage(`Error: ${(err as Error).message}`);
    }
  }

  async function remove(id: string) {
    try {
      await api.deleteDocument(user!.tenantId, token!, id);
      setMessage("Document deleted");
      await loadDocs();
    } catch (err) {
      setMessage(`Error: ${(err as Error).message}`);
    }
  }

  async function uploadPdf(e: FormEvent) {
    e.preventDefault();
    if (!pdfFile) {
      setMessage("Please select a PDF file.");
      return;
    }
    const isPdf = pdfFile.type === "application/pdf" || pdfFile.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setMessage("Only PDF files are allowed.");
      return;
    }

    try {
      await api.uploadPdfDocument(user!.tenantId, token!, pdfFile, pdfFileName || undefined);
      setMessage("PDF uploaded");
      setPdfFile(null);
      setPdfFileName("");
      await loadDocs();
    } catch (err) {
      setMessage(`Error: ${(err as Error).message}`);
    }
  }

  return (
    <div className="stack">
      <Card title="Documents">
        <button onClick={loadDocs}>Refresh</button>
        <div className="list">
          {docs.map((d) => (
            <div key={d.id} className="list-item">
              <div>
                <b>{d.fileName}</b>
                <p>{new Date(d.createdAt).toLocaleString()}</p>
              </div>
              <CapabilityGate permission="documents:delete">
                <button onClick={() => remove(d.id)}>Delete</button>
              </CapabilityGate>
            </div>
          ))}
        </div>
      </Card>

      <CapabilityGate permission="documents:upload">
        <Card title="Upload Text Document">
          <form onSubmit={upload} className="stack">
            <input value={fileName} onChange={(e) => setFileName(e.target.value)} />
            <textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
            <button type="submit">Upload</button>
          </form>
        </Card>
      </CapabilityGate>

      <CapabilityGate permission="documents:upload">
        <Card title="Upload PDF Document">
          <form onSubmit={uploadPdf} className="stack">
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            />
            <input
              placeholder="Optional custom file name"
              value={pdfFileName}
              onChange={(e) => setPdfFileName(e.target.value)}
            />
            <button type="submit">Upload PDF</button>
          </form>
        </Card>
      </CapabilityGate>
      {message && <p className="notice">{message}</p>}
    </div>
  );
}
