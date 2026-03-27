import { useRef } from "react";
import api from "@/lib/api";

function UploadCSV({ onSuccess, onError, children }) {
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("csvFile", file);

    try {
      const res = await api.post("/products/upload-csv", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (onSuccess) {
        onSuccess(res.data);
      } else {
        alert(`Upload success! ${res.data.count} products added.`);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      if (onError) {
        onError(errorMsg);
      } else {
        alert("Upload failed: " + errorMsg);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
      <button onClick={handleClick}>
        {children || "Upload CSV"}
      </button>
    </>
  );
}

export default UploadCSV;