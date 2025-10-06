import type React from "react";
import styled from "styled-components";
import useSWR from "swr";
import usePanelStore from "./panelStore";

interface WikipediaMobileProps {
  wikipediaSpec?: string | null; // if provided, skip computing
  className?: string;
}

export const WikipediaPreview: React.FC<WikipediaMobileProps> = ({
  wikipediaSpec,
  className = "",
}) => {
  const { data, isLoading, error } = useSWR(
    wikipediaSpec
      ? `/api/wiki?title=${encodeURIComponent(wikipediaSpec)}`
      : null,
    (url) =>
      fetch(url).then(async (res) => {
        const text = await res.text();
        return (
          text
            // Proxy Wikimedia upload host through images.weserv.nl
            // Replace all occurrences, including within srcset lists
            .replace(
              /\/\/upload\.wikimedia\.org/g,
              "https://images.weserv.nl/?url=//upload.wikimedia.org",
            )
            // add target="_blank" rel="noopener noreferrer" to all links
            .replace(
              /<a(?![^>]*target=)([^>]*)(>)/gi,
              '<a$1 target="_blank" rel="noopener noreferrer"$2',
            )
        );
      }),
  );

  if (!wikipediaSpec) {
    return (
      <div className={`text-xs text-gray-500 ${className}`}>暂无维基内容</div>
    );
  }

  return (
    <div
      className={`max-w-[450px] px-10 py-3  bg-white rounded-lg  shadow-xl border border-white/10   ${className}`}
    >
      {isLoading ? (
        <div className="absolute  inset-0 flex items-center justify-center bg-white/60 z-10">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
        </div>
      ) : null}
      {/** biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation> */}
      <StyledContainer dangerouslySetInnerHTML={{ __html: data as any }} />
    </div>
  );
};

const StyledContainer = styled.div`
  /* —— Map of Shanghai: Embedded Wikipedia beautify —— */
  :root {
    color-scheme: light;
  }
  html,
  body {
    margin: 0;
    padding: 0;
    background: transparent;
  }

  /* Hide chrome, edit tools, nav boxes, ToC, etc. */
  .header-container,
  .mw-mf-page-header,
  .minerva-footer,
  .page-actions-menu,
  .last-modified-bar,
  .minerva-talk-tab,
  .minerva-watch-tab,
  .edit-page,
  .mw-editsection,
  .toc,
  .navbox,
  .sisterproject,
  .ambox,
  .noprint,
  .hatnote,
  .shortdescription,
  .metadata,
  .infobox-below {
    display: none !important;
  }

  /* Typography */
  body,
  .mw-parser-output {
    font-size: 15px !important;
    line-height: 1.6 !important;
  }
  .mw-parser-output {
    max-width: 100% !important;
  }
  .mw-parser-output > * {
    max-width: 100%;
  }

  a {
    color: #2563eb;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    line-height: 1.3;
    margin: 1.1em 0 0.6em;
    font-weight: 600;
    color: #0f172a;
  }
  h1 {
    font-size: 1.4rem;
  }
  h2 {
    font-size: 1.25rem;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 0.25em;
  }
  h3 {
    font-size: 1.1rem;
  }
  h4 {
    font-size: 1rem;
  }

  p {
    margin: 0.6em 0;
  }
  ul,
  ol {
    margin: 0.6em 0 0.6em 1.2em;
  }
  li {
    margin: 0.2em 0;
  }
  hr {
    border: 0;
    border-top: 1px solid #e5e7eb;
    margin: 1.2em 0;
  }

  blockquote {
    margin: 0.8em 0;
    padding: 0.6em 0.8em;
    background: #f8fafc;
    border-left: 3px solid #cbd5e1;
    border-radius: 4px;
    color: #0f172a;
  }

  code,
  pre,
  kbd {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      "Liberation Mono", "Courier New", monospace;
  }
  pre {
    background: #0b0f19;
    color: #e5e7eb;
    padding: 10px 12px;
    border-radius: 6px;
    overflow: auto;
  }

  /* Images & thumbnails */
  img {
    max-width: 100% !important;
    height: auto !important;
  }
  .thumb {
    margin: 0.6em 0;
  }
  .thumb .thumbinner {
    width: auto !important;
  }
  .thumb img {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
  }
  .thumb .thumbcaption {
    color: #6b7280;
    font-size: 0.85em;
    padding-top: 0.3em;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    border: 1px solid #e5e7eb;
    padding: 6px 8px;
    vertical-align: top;
  }
  table.infobox,
  .infobox {
    width: 100% !important;
    float: none !important;
    margin: 0.6em 0 1em !important;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  }
  .infobox th,
  .infobox td {
    border: none;
    padding: 6px 8px;
  }
  .infobox .infobox-image img {
    width: 100%;
    height: auto;
    border-radius: 6px;
  }

  /* References */
  sup.reference,
  .mw-ref {
    line-height: 0;
  }
  .reference,
  .reflist {
    font-size: 0.9em;
    color: #334155;
  }
  .mw-ext-cite-error {
    display: none;
  }

  /* Galleries & maps */
  .gallery {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .gallery img {
    width: 100%;
    height: auto;
  }
  .mw-kartographer-container,
  .mw-kartographer-map {
    max-width: 100% !important;
  }
`;
