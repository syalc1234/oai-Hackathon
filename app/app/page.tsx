"use client"
import React, { useCallback, useState, ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Video, Wand2, Clipboard, Trash2, Link as LinkIcon, Loader2 } from "lucide-react";
import OpenAI from "openai";

// --- HeroUI components ---
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Input,
  Textarea,
  Switch,
  Divider,
  Tooltip,
} from "@heroui/react";
import { SOP_PROMPT } from "./prompt";

// ===== Types =====
interface SOPJson {
  version: string;
  effectiveDate: string; // YYYY-MM-DD
  source?: string;
  prerequisites?: string[];
  steps: string[];
  notes?: string;
}

interface EncodedFile {
  filename: string;
  dataUrl: string; // data:*/*;base64,
  mime: string;
}

interface GeneratePayload {
  model?: string;
  input: {
    pdf: EncodedFile | null;
    video: EncodedFile | null;
    transcriptText: string | null;
  };
  options?: {
    output: "json";
    schema: unknown; // keep generic so you can swap validators
  };
  system?: string;
}

// Simple JSON schema you can refine on the server
const SOP_SCHEMA: unknown = {
  type: "object",
  properties: {
    version: { type: "string" },
    effectiveDate: { type: "string" },
    source: { type: "string" },
    prerequisites: { type: "array", items: { type: "string" } },
    steps: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
  },
  required: ["version", "effectiveDate", "steps"],
};

const acceptTranscript = "text/plain,.txt,.vtt,.srt,.md,application/json";
const acceptPdf = "application/pdf,.pdf";
const API_KEY = "";

const App: React.FC = () => {
  // ---- Source state ----
  const [pdfFile, setPdfFile] = useState<File | null>(null); // forwarded to backend only
  const [videoFile, setVideoFile] = useState<File | null>(null); // forwarded to backend only
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [transcriptText, setTranscriptText] = useState<string>("");

  // ---- LLM call config ----
  const [endpointUrl, setEndpointUrl] = useState<string>("/api/generate-sop");
  const [model, setModel] = useState<string>("gpt-4o-mini");
  const [mockLocally, setMockLocally] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  // ---- Output ----
  const [resultJson, setResultJson] = useState<SOPJson | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const resetAll = (): void => {
    setPdfFile(null);
    setVideoFile(null);
    setTranscriptFile(null);
    setTranscriptText("");
    setResultJson(null);
    setErrorMsg("");
  };

  const onPdfChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0] || null;
    setPdfFile(f);
  };

  const onVideoChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0] || null;
    setVideoFile(f);
  };

  const onTranscriptFile = async (file: File): Promise<void> => {
    setTranscriptFile(file);
    try {
      const text = await file.text();
      setTranscriptText((prev) => (prev ? prev + "\n\n" : "") + text);
    } catch (e) {
      console.error(e);
      setErrorMsg("Couldn't read transcript file.");
    }
  };

  // ---- Minimal local mock to unblock UI before wiring backend ----


  // ---- helpers ----
  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve((r.result || "").toString());
      r.onerror = () => reject(new Error("Failed to read file"));
      r.readAsDataURL(file);
    });

  // ---- Build request payload for your backend/LLM ----
  const buildRequestBody = async (): Promise<GeneratePayload> => {
    const payload: GeneratePayload = {
      model,
      input: {
        pdf: pdfFile
          ? { filename: pdfFile.name, dataUrl: await fileToDataUrl(pdfFile), mime: pdfFile.type || "application/pdf" }
          : null,
        video: videoFile
          ? { filename: videoFile.name, dataUrl: await fileToDataUrl(videoFile), mime: videoFile.type || "video/*" }
          : null,
        transcriptText: transcriptText || null,
      }
    };

    return payload;
  };


  // types shared with backend (or duplicate them server-side)
type EncodedFile = { filename: string; dataUrl: string; mime: string };
type GeneratePayload = {
  model?: string;
  input: {
    pdf: EncodedFile | null;
    video: EncodedFile | null;
    transcriptText: string | null;
  };
};


const callBackend = useCallback(async (): Promise<void> => {
  setLoading(true);
  setErrorMsg("");
  try {
    const body = await buildRequestBody();

    // Point this at your API route (below)
    const res = await fetch("/api/generate-sop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);

    const data = await res.json(); // pure SOP JSON from the backend
    setResultJson(data as any);
  } catch (e: unknown) {
    console.error(e);
    setErrorMsg(e instanceof Error ? e.message : "Something went wrong calling the backend");
  } finally {
    setLoading(false);
  }
}, [model, pdfFile, videoFile, transcriptText]);


  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <header className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="text-3xl md:text-4xl font-bold tracking-tight"
          >
            SOP Generator
          </motion.h1>
          <p className="text-slate-600 mt-2">Upload your files and get a Standard Operating Procedure</p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Source */}
          <Card shadow="sm" className="border border-slate-200">
            <CardHeader className="flex flex-col gap-1">
              <div className="text-lg font-semibold">Source</div>
              <div className="text-sm text-slate-500">Upload a PDF / Video and/or paste a transcript.</div>
            </CardHeader>
            <Divider />
            <CardBody className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">PDF (optional)</label>
                <Input type="file" accept={acceptPdf} onChange={onPdfChange} startContent={<Upload size={16} />} />
                {pdfFile && <div className="text-xs text-slate-500">Selected: {pdfFile.name}</div>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Video (optional)</label>
                <Input type="file" accept="video/*" onChange={onVideoChange} startContent={<Video size={16} />} />
                {videoFile && <div className="text-xs text-slate-500">Selected: {videoFile.name}</div>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Transcript / Notes file</label>
                <Input
                  type="file"
                  accept={acceptTranscript}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const f = e.target.files?.[0];
                    if (f) void onTranscriptFile(f);
                  }}
                  startContent={<FileText size={16} />}
                />
                {transcriptFile && <div className="text-xs text-slate-500">Added: {transcriptFile.name}</div>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Or paste transcript / notes</label>
                <Textarea
                  minRows={8}
                  value={transcriptText}
                  onChange={(e) => setTranscriptText(e.target.value)}
                  placeholder="Paste transcript or rough notes here..."
                />
              </div>

              <Divider />

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button color="default" variant="flat" onPress={resetAll} startContent={<Trash2 size={16} />}>Reset</Button>
                  <Button color="primary" onPress={() => void callBackend()} startContent={<Wand2 size={16} />}>{loading ? "Generating…" : "Generate"}</Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Output */}
          <Card shadow="sm" className="border border-slate-200">
            <CardHeader className="flex items-center justify-between">
              <div className="text-lg font-semibold flex items-center gap-2"><FileText size={18} /> Output</div>
              <div className="text-xs text-slate-500">LLM returns JSON (schema-friendly)</div>
            </CardHeader>
            <Divider />
            <CardBody>
              {loading ? (
                <div className="flex items-center gap-2 text-slate-600 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Working…</div>
              ) : resultJson ? (
                <pre className="whitespace-pre-wrap text-sm leading-6 p-3 bg-slate-50 rounded-xl border border-slate-200 min-h-[220px]">{JSON.stringify(resultJson, null, 2)}</pre>
              ) : (
                <div className="text-sm text-slate-500">No result yet. Add a source and click Generate.</div>
              )}
              {errorMsg && <div className="text-sm text-red-600 mt-2">{errorMsg}</div>}
            </CardBody>
            <CardFooter>
              <div className="flex gap-2">
                <Tooltip content="Copy JSON">
                {/*<Button isDisabled={!resultJson} variant="flat" onPress={() => void copyJson()} startContent={<Clipboard size={16} />}>Copy</Button>*/}
                </Tooltip>
                <Tooltip content="Download as .json">
                  <Button
                    isDisabled={!resultJson}
                    variant="flat"
                    onPress={() => {
                      if (!resultJson) return;
                      const blob = new Blob([JSON.stringify(resultJson, null, 2)], { type: "application/json;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "sop.json";
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download
                  </Button>
                </Tooltip>
              </div>
            </CardFooter>
          </Card>
        </div>

        <p className="text-xs text-slate-500 mt-6">
          Tip: your backend can transcribe video and extract PDF text server-side, then feed the cleaned text to the LLM. Keep the schema stable so it’s easy to store and diff SOPs.
        </p>
      </div>
    </div>
  );
};

export default App;
