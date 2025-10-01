"use client"

import React, { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  FileVideo,
  FileText,
  FileType,
  Upload,
  X,
  Sparkles,
  Wand2,
  Trash2,
  Loader2,
} from "lucide-react"

// ===== Types =====
interface EncodedFile {
  filename: string
  dataUrl: string
  mime: string
}

interface GeneratePayload {
  model?: string
  input: {
    pdf: EncodedFile | null
    video: EncodedFile | null
    transcriptText: string | null
  }
}

export default function Page() {
  const router = useRouter()

  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string>("")

  const acceptedTypes = [
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]

  // ---- Drag + Drop ----
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    processFiles(droppedFiles)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      processFiles(selectedFiles)
    }
  }, [])

  const processFiles = (fileList: File[]) => {
    const validFiles = fileList.filter((file) => acceptedTypes.includes(file.type))
    setFiles((prev) => [...prev, ...validFiles])
  }

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((file) => file.name !== name))
  }

  const resetAll = () => {
    setFiles([])
    setTranscript("")
    setErrorMsg("")
  }

  // ---- Helpers ----
  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve((r.result || "").toString())
      r.onerror = () => reject(new Error("Failed to read file"))
      r.readAsDataURL(file)
    })

  // ---- Build Request ----
  const buildRequestBody = async (): Promise<GeneratePayload> => {
    let pdf: EncodedFile | null = null
    let video: EncodedFile | null = null

    for (const f of files) {
      if (f.type === "application/pdf") {
        pdf = { filename: f.name, dataUrl: await fileToDataUrl(f), mime: f.type }
      }
      if (f.type.startsWith("video/")) {
        video = { filename: f.name, dataUrl: await fileToDataUrl(f), mime: f.type }
      }
    }

    return {
      model: "gpt-4o-mini",
      input: {
        pdf,
        video,
        transcriptText: transcript || null,
      },
    }
  }

  // ---- Call Backend ----
  const callBackend = useCallback(async () => {
    setLoading(true)
    setErrorMsg("")
    try {
      const body = await buildRequestBody()
      const res = await fetch("/api/generate-sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const data = await res.json()

      // Save to session for next page
      sessionStorage.setItem("sop_result_json", JSON.stringify(data))
      router.push("/next")
    } catch (e: unknown) {
      console.error(e)
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [files, transcript, router])

  const getFileIcon = (type: string) => {
    if (type.startsWith("video/")) return <FileVideo className="h-5 w-5" />
    if (type === "application/pdf") return <FileText className="h-5 w-5" />
    return <FileType className="h-5 w-5" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  // ---- UI ----
  return (
    <main className="min-h-screen bg-[#1a1a3e] p-6 md:p-12 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-[#ff6b6b]/20 p-3">
            <Sparkles className="h-6 w-6 text-[#ff6b6b]" />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mb-3 font-sans text-4xl font-bold text-white"
          >
            SOP Generator
          </motion.h1>
          <p className="text-lg text-[#8a8aa8]">
            Upload your content or paste a transcript to generate a Standard Operating Procedure
          </p>
        </div>

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`mb-6 rounded-xl border-2 border-dashed p-16 text-center transition-all duration-300 ${
            isDragging
              ? "scale-[1.02] border-[#ff6b6b] bg-[#2d2d52]"
              : "border-[#2d2d52] bg-[#252547] hover:border-[#ff6b6b]/50 hover:bg-[#2d2d52]"
          }`}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept=".mp4,.mov,.avi,.pdf,.doc,.docx"
            onChange={handleFileInput}
          />
          <label htmlFor="file-upload" className="flex cursor-pointer flex-col items-center gap-4">
            <div className="rounded-2xl bg-[#ff6b6b]/20 p-5 transition-transform group-hover:scale-110">
              <Upload className="h-10 w-10 text-[#ff6b6b]" />
            </div>
            <div>
              <p className="mb-2 text-xl font-semibold text-white">Drop your files here or click to browse</p>
              <p className="text-sm text-[#8a8aa8]">
                Supports: Video (MP4, MOV, AVI), PDF, Word (DOC, DOCX)
              </p>
            </div>
          </label>
        </div>

        {/* Transcript Input */}
        <div className="mb-6 rounded-xl border-2 border-[#2d2d52] bg-[#252547] p-8 shadow-xl">
          <h2 className="mb-2 text-xl font-semibold text-white">Paste transcript / notes</h2>
          <p className="text-sm text-[#8a8aa8] mb-4">Already have a transcript? Paste it here</p>
          <textarea
            placeholder="Paste your transcript or rough notes here..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full min-h-[200px] resize-none rounded-lg border-2 border-[#2d2d52] bg-[#2d2d52] p-3 text-base text-white placeholder:text-[#8a8aa8] focus-visible:border-[#ff6b6b] focus:outline-none"
          />
        </div>

        {/* Uploaded Files List */}
        {files.length > 0 && (
          <div className="mb-6 rounded-xl border-2 border-[#2d2d52] bg-[#252547] p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-white">Uploaded Files ({files.length})</h2>
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between rounded-lg border-2 border-[#2d2d52] bg-[#2d2d52] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-[#ff6b6b]/20 p-2 text-[#ff6b6b]">{getFileIcon(file.type)}</div>
                    <div>
                      <p className="font-medium text-white">{file.name}</p>
                      <p className="text-sm text-[#8a8aa8]">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(file.name)}
                    className="p-2 rounded-lg text-[#8a8aa8] hover:text-[#ff6b6b]"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={resetAll}
            disabled={files.length === 0 && !transcript}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-[#2d2d52] bg-transparent py-3 text-base font-semibold text-white hover:bg-[#2d2d52] hover:text-[#ff6b6b] disabled:opacity-50"
          >
            <Trash2 className="h-5 w-5" /> Reset
          </button>
          <button
            onClick={callBackend}
            disabled={loading || (files.length === 0 && !transcript)}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#ff6b6b] py-3 text-base font-semibold text-white shadow-lg hover:bg-[#e45a5a] disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>

        {errorMsg && <div className="text-sm text-red-400 mt-4">{errorMsg}</div>}
      </div>
    </main>
  )
}
