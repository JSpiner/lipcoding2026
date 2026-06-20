"use client";

type ExportButtonsProps = {
  mermaid: string;
  onCopy: () => Promise<void>;
};

export function ExportButtons({ mermaid, onCopy }: ExportButtonsProps) {
  const disabled = !mermaid.trim();

  function downloadTextFile(filename: string, text: string, type: string) {
    const blob = new Blob([text], { type });
    downloadBlob(filename, blob);
  }

  function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function getRenderedSvg() {
    const svg = document.querySelector(".diagram-stage svg");
    return svg instanceof SVGSVGElement ? svg : null;
  }

  function downloadSvg() {
    const svg = getRenderedSvg();

    if (!svg) {
      return;
    }

    downloadTextFile("malgrim-diagram.svg", serializeExportSvg(svg), "image/svg+xml;charset=utf-8");
  }

  async function downloadPng() {
    try {
      const svg = getRenderedSvg();

      if (!svg) {
        return;
      }

      const serializedSvg = serializeExportSvg(svg);
      const imageUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializedSvg)}`;
      const image = new Image();
      image.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("SVG 이미지를 PNG로 변환하지 못했습니다."));
        image.src = imageUrl;
      });

      const canvas = document.createElement("canvas");
      const width = Math.max(1, Math.ceil(svg.viewBox.baseVal.width || svg.getBoundingClientRect().width || 1200));
      const height = Math.max(1, Math.ceil(svg.viewBox.baseVal.height || svg.getBoundingClientRect().height || 800));
      canvas.width = width * 2;
      canvas.height = height * 2;

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.fillStyle = "#fff7d6";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.scale(2, 2);
      context.drawImage(image, 0, 0, width, height);

      const blob = await canvasToBlob(canvas);
      downloadBlob("malgrim-diagram.png", blob);
    } catch {
      downloadSvg();
    }
  }

  function serializeExportSvg(svg: SVGSVGElement) {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    inlineForeignObjectLabels(clone);
    clone.querySelectorAll("script, image").forEach((element) => element.remove());
    clone.querySelectorAll("text, tspan").forEach((element) => {
      element.setAttribute("fill", element.getAttribute("fill") ?? "#111111");
      element.setAttribute("font-family", element.getAttribute("font-family") ?? "Arial, Helvetica, sans-serif");
      element.setAttribute("font-size", element.getAttribute("font-size") ?? "16");
    });

    const width = Math.ceil(svg.viewBox.baseVal.width || svg.getBoundingClientRect().width || 1200);
    const height = Math.ceil(svg.viewBox.baseVal.height || svg.getBoundingClientRect().height || 800);
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));

    return new XMLSerializer().serializeToString(clone);
  }

  function inlineForeignObjectLabels(svg: SVGSVGElement) {
    svg.querySelectorAll("foreignObject").forEach((foreignObject) => {
      const label = foreignObject.textContent?.replace(/\s+/g, " ").trim();

      if (!label) {
        foreignObject.remove();
        return;
      }

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      const x = Number(foreignObject.getAttribute("x") ?? 0) + Number(foreignObject.getAttribute("width") ?? 0) / 2;
      const y = Number(foreignObject.getAttribute("y") ?? 0) + Number(foreignObject.getAttribute("height") ?? 0) / 2;

      text.setAttribute("x", String(x));
      text.setAttribute("y", String(y));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("fill", "#111111");
      text.setAttribute("font-family", "Arial, Helvetica, sans-serif");
      text.setAttribute("font-size", "16");
      text.textContent = label;
      foreignObject.replaceWith(text);
    });
  }

  async function canvasToBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob>((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("PNG 이미지 생성에 실패했습니다."));
          }
        }, "image/png");
      } catch (error) {
        reject(error);
      }
    });
  }

  return (
    <div className="export-buttons" aria-label="내보내기">
      <button className="secondary-button" disabled={disabled} onClick={onCopy} type="button">
        COPY
      </button>
      <button className="secondary-button" disabled={disabled} onClick={() => downloadTextFile("malgrim-diagram.mmd", mermaid, "text/plain;charset=utf-8")} type="button">
        MMD
      </button>
      <button className="secondary-button" disabled={disabled} onClick={downloadSvg} type="button">
        SVG
      </button>
      <button className="secondary-button" disabled={disabled} onClick={() => void downloadPng()} type="button">
        PNG
      </button>
    </div>
  );
}
