"use client"

import React, { useEffect, useState } from "react"

const NextPage: React.FC = () => {
  const [sopJson, setSopJson] = useState<any | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("sop_result_json")
      if (raw) {
        setSopJson(JSON.parse(raw))
      }
    } catch {
      // ignore parse errors
    }
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1a1a3e] p-6 text-white">
      <div className="w-full max-w-4xl text-center">
        <h1 className="mb-3 font-sans text-4xl font-bold text-white">
          SOP — Next Step
        </h1>
        <p className="text-[#8a8aa8] mb-6">
          Your Standard Operating Procedure has been generated successfully.
        </p>

        {sopJson ? (
          <div className="rounded-xl border-2 border-[#2d2d52] bg-[#252547] p-6 text-left shadow-xl">
            <pre className="whitespace-pre-wrap text-sm leading-6 text-white">
              {JSON.stringify(sopJson, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="text-[#8a8aa8]">
            No SOP found. Go back and generate one first.
          </div>
        )}
      </div>
    </main>
  )
}

export default NextPage
