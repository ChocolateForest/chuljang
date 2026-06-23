import { useState } from "react";

const LAYOUTS = [
  { label: "2컷", value: 2 },
  { label: "4컷", value: 4 },
  { label: "6컷", value: 6 },
];

function resizeImage(dataUrl, maxW, maxH) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = dataUrl;
  });
}

function fileToDataUrl(file) {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = (e) => res(e.target.result);
    r.readAsDataURL(file);
  });
}

function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

export default function App() {
  const [title, setTitle] = useState("");
  const [layout, setLayout] = useState(2);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const addPhotos = async (files) => {
    if (!files || !files.length) return;
    const arr = await Promise.all(
      Array.from(files).map(async (f) => ({
        dataUrl: await fileToDataUrl(f),
        caption: "",
      }))
    );
    setPhotos((p) => [...p, ...arr]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addPhotos(e.dataTransfer.files);
  };

  const updateCaption = (i, v) =>
    setPhotos((p) => p.map((x, idx) => (idx === i ? { ...x, caption: v } : x)));
  const removePhoto = (i) => setPhotos((p) => p.filter((_, idx) => idx !== i));
  const movePhoto = (i, d) => {
    setPhotos((p) => {
      const a = [...p]; const j = i + d;
      if (j < 0 || j >= a.length) return a;
      [a[i], a[j]] = [a[j], a[i]]; return a;
    });
  };

  const generate = async () => {
    if (!photos.length) return alert("사진을 먼저 추가해주세요.");
    setLoading(true);
    try {
      const cols = layout === 2 ? 1 : layout === 4 ? 2 : 3;
      const maxW = layout === 2 ? 720 : layout === 4 ? 480 : 340;
      const maxH = layout === 2 ? 500 : layout === 4 ? 340 : 240;
      const imgH = layout === 2 ? "200px" : layout === 4 ? "170px" : "130px";

      const resized = await Promise.all(
        photos.map(async (p) => ({ ...p, dataUrl: await resizeImage(p.dataUrl, maxW, maxH) }))
      );

      const pages = [];
      for (let i = 0; i < resized.length; i += layout)
        pages.push(resized.slice(i, i + layout));

      const pageHtml = pages.map((page, pi) => {
        const cells = page.map((p) => `
          <div class="cell">
            <div class="img-wrap"><img src="${p.dataUrl}" /></div>
            <div class="caption">${p.caption ? esc(p.caption) : "&nbsp;"}</div>
          </div>`).join("");
        const num = pages.length > 1 ? ` (${pi+1}/${pages.length})` : "";
        return `<div class="page">
  <div class="pt">${esc(title || "현장 사진대장")}${num}</div>
  <div class="grid c${cols}">${cells}</div>
</div>`;
      }).join("\n");

      const html = `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"><title>${esc(title||"현장 사진대장")}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#ddd;font-family:"맑은 고딕",sans-serif}
.page{width:210mm;min-height:297mm;background:#fff;margin:10mm auto;padding:20mm 18mm 15mm;page-break-after:always;box-shadow:0 2px 10px rgba(0,0,0,.2);display:flex;flex-direction:column}
.pt{font-family:"HY견고딕","HYGothic-Extra","맑은 고딕",sans-serif;font-size:22pt;font-weight:normal;text-align:center;padding-bottom:6mm;border-bottom:2.5px solid #222;margin-bottom:8mm}
.grid{display:grid;gap:5mm;flex:1;align-content:start}
.c1{grid-template-columns:1fr}
.c2{grid-template-columns:1fr 1fr}
.c3{grid-template-columns:1fr 1fr 1fr}
.cell{border:1px solid #aaa;display:flex;flex-direction:column}
.img-wrap{flex:1;min-height:${imgH};background:#f0f0f0;display:flex;align-items:center;justify-content:center;overflow:hidden}
.img-wrap img{max-width:100%;max-height:100%;object-fit:contain;display:block}
.caption{font-family:"휴먼명조","HY신명조","바탕",serif;font-size:15pt;text-align:center;padding:3mm 4mm;border-top:1px solid #bbb;background:#fafafa;word-break:keep-all;line-height:1.5;min-height:11mm}
@media print{body{background:none}.page{margin:0;box-shadow:none;padding:15mm}}
</style></head><body>${pageHtml}</body></html>`;

      // 새 탭에 직접 열기 (다운로드 차단 우회)
      const newTab = window.open("", "_blank");
      if (newTab) {
        newTab.document.open();
        newTab.document.write(html);
        newTab.document.close();
      } else {
        alert("팝업이 차단됐어요. 브라우저에서 팝업 허용 후 다시 시도해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  const card = { background: "#fff", borderRadius: 16, padding: "22px 20px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", marginBottom: 16 };
  const lbl = { fontWeight: 600, fontSize: 14, color: "#333", display: "block", marginBottom: 8 };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#e8f4fd,#f0f7ee)", padding: "20px 14px 40px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#1a5276" }}>📷 현장 사진대장</div>
          <div style={{ color: "#888", marginTop: 4, fontSize: 12 }}>HY견고딕 22pt 제목 · 휴먼명조 15pt 캡션</div>
        </div>

        {/* 제목 */}
        <div style={card}>
          <label style={lbl}>📌 대장 제목</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="예) 2025 현장점검 사진대장"
            style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1.5px solid #d0d7de", fontSize: 14, outline: "none" }} />
        </div>

        {/* 레이아웃 */}
        <div style={card}>
          <label style={lbl}>📐 A4 레이아웃 (페이지당 사진 수)</label>
          <div style={{ display: "flex", gap: 8 }}>
            {LAYOUTS.map((l) => (
              <button key={l.value} onClick={() => setLayout(l.value)}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 10,
                  border: layout === l.value ? "2px solid #1a5276" : "1.5px solid #d0d7de",
                  background: layout === l.value ? "#eaf3fb" : "#fafafa",
                  color: layout === l.value ? "#1a5276" : "#666",
                  fontWeight: layout === l.value ? 700 : 400,
                  cursor: "pointer", fontSize: 15,
                }}>
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* 사진 추가 — 드래그 영역 포함 */}
        <div style={card}>
          <label style={lbl}>🖼 사진 추가</label>

          {/* 드래그 & 드롭 영역 (PC) */}
          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            style={{
              border: `2px dashed ${dragging ? "#1a5276" : "#90caf9"}`,
              background: dragging ? "#dbeeff" : "#f0f7ff",
              borderRadius: 12, padding: "18px 12px",
              textAlign: "center", color: "#1a5276",
              fontSize: 14, marginBottom: 10,
              transition: "all 0.15s",
            }}>
            📂 여기에 사진을 드래그 & 드롭 (PC)
          </div>

          {/* 모바일: 갤러리 / 카메라 */}
          <div style={{ display: "flex", gap: 10 }}>
            <label style={{
              flex: 1, padding: "14px 8px", borderRadius: 12,
              border: "2px dashed #90caf9", background: "#f0f7ff",
              color: "#1a5276", fontWeight: 600, fontSize: 14,
              cursor: "pointer", textAlign: "center", display: "block",
            }}>
              🗂 갤러리
              <input type="file" accept="image/*" multiple style={{ display: "none" }}
                onChange={(e) => addPhotos(e.target.files)} />
            </label>
            <label style={{
              flex: 1, padding: "14px 8px", borderRadius: 12,
              border: "2px dashed #81c784", background: "#f0fff4",
              color: "#1b5e20", fontWeight: 600, fontSize: 14,
              cursor: "pointer", textAlign: "center", display: "block",
            }}>
              📸 카메라
              <input type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                onChange={(e) => addPhotos(e.target.files)} />
            </label>
          </div>
        </div>

        {/* 사진 목록 */}
        {photos.length > 0 && (
          <div style={card}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#333", marginBottom: 12 }}>
              🗂 사진 목록 — {photos.length}장
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f8fbff", borderRadius: 10, border: "1px solid #dde8f5" }}>
                  <img src={p.dataUrl} alt="" style={{ width: 64, height: 52, objectFit: "cover", borderRadius: 6, flexShrink: 0, border: "1px solid #ccc" }} />
                  <input value={p.caption} onChange={(e) => updateCaption(i, e.target.value)}
                    placeholder="캡션 입력"
                    style={{ flex: 1, padding: "9px 11px", borderRadius: 6, border: "1.5px solid #d0d7de", fontSize: 14, outline: "none" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, flexShrink: 0 }}>
                    <button onClick={() => movePhoto(i, -1)} disabled={i === 0}
                      style={{ width: 30, height: 28, fontSize: 12, cursor: "pointer", borderRadius: 4, border: "1px solid #ccc", background: "#fff", opacity: i === 0 ? 0.3 : 1 }}>▲</button>
                    <button onClick={() => movePhoto(i, 1)} disabled={i === photos.length - 1}
                      style={{ width: 30, height: 28, fontSize: 12, cursor: "pointer", borderRadius: 4, border: "1px solid #ccc", background: "#fff", opacity: i === photos.length - 1 ? 0.3 : 1 }}>▼</button>
                  </div>
                  <button onClick={() => removePhoto(i)}
                    style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: "#fdecea", color: "#c0392b", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 다운로드 */}
        <button onClick={generate} disabled={loading || !photos.length}
          style={{
            width: "100%", padding: "16px", borderRadius: 14,
            background: photos.length ? "#1a5276" : "#bbb",
            color: "#fff", fontWeight: 700, fontSize: 17,
            border: "none", cursor: photos.length ? "pointer" : "not-allowed",
            boxShadow: photos.length ? "0 4px 14px rgba(26,82,118,0.35)" : "none",
          }}>
          {loading ? "⏳ 생성 중..." : "🖨️ 사진대장 새 탭으로 열기"}
        </button>

        <div style={{ marginTop: 12, textAlign: "center", color: "#aaa", fontSize: 12, lineHeight: 1.9 }}>
          HTML이 새 탭으로 열립니다 → <strong>Ctrl+P</strong> 인쇄·PDF 저장 / <strong>Ctrl+S</strong> HTML 파일 저장<br />
          HY견고딕·휴먼명조는 한글 설치 PC에서 정확히 표시됩니다
        </div>
      </div>
    </div>
  );
}
