import React from "react";

export default function Toast({ message, type = "success" }: { message: string; type?: "success" | "error" }) {
  return (
    <div className={`fixed right-6 bottom-6 z-50 max-w-sm rounded-md p-4 shadow-lg ${type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
      <div className="text-sm">{message}</div>
    </div>
  );
}
