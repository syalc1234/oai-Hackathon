"use client";
import React from "react";
import { useEffect, useState } from "react";

const NextPage: React.FC = () => {
  const [sopJson, setSopJson] = useState<any | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("sop_result_json");
      if (raw) {
        setSopJson(JSON.parse(raw));
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-4">SOP — Next Step</h1>
        {sopJson ? (
          <pre className="whitespace-pre-wrap text-sm leading-6 p-4 bg-slate-50 rounded-xl border border-slate-200">{JSON.stringify(sopJson, null, 2)}</pre>
        ) : (
          <div className="text-slate-500">No SOP found. Go back and generate one first.</div>
        )}
      </div>
    </div>
  );
};

export default NextPage;
