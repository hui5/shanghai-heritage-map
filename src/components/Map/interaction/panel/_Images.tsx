import type React from "react";
import usePanelStore from "./panelStore";

export interface Image {
  title: string;
  thumbnail: string;
  url: string;
  description?: string;
  address?: string;
  ref?: string;
  date?: string;
  source?: string;
}

interface Data {
  images: Image[];
  categoryUrl?: string;
}

interface ImagesPreviewProps {
  data?: Data | null;
  className?: string;
  title: string;
  maxWidth?: number;
}

export const ImagesPreview: React.FC<ImagesPreviewProps> = ({
  data,
  className = "",
  maxWidth = 500,
  title,
}) => {
  const setPinned = usePanelStore((s) => s.setPinned);
  const isFullscreen = usePanelStore((s) => s.isFullscreen);

  return (
    <div
      className={` backdrop-blur-md rounded-lg  shadow-xl border border-white/10   overflow-hidden  ${className}`}
      style={{ maxWidth: maxWidth + 58 }}
    >
      {/* <div className="p-4 border-b bg-pink-50">
        <h3 className="text-base font-semibold text-pink-900">{title}</h3>
      </div> */}

      <div className="p-4">
        {/* 所有图片以大图形式显示 */}
        {data && data.images?.length > 0 && (
          <div className="space-y-3 mb-4">
            {data.images.map((image) => (
              <div
                key={image.thumbnail}
                className="block rounded-lg hover:shadow-lg transition-all duration-200 group"
              >
                <a
                  href={image.ref || image.url}
                  target="_blank"
                  onClick={(e) => {
                    setPinned(true);
                  }}
                  rel="noopener noreferrer"
                >
                  <div className="flex items-center justify-center p-3 min-h-[120px]  bg-gradient-to-br from-transparent via-white/5 to-white/10  rounded-lg ">
                    <img
                      src={image.thumbnail}
                      alt={image.title}
                      className={` ${
                        isFullscreen ? "max-h-[550px]" : "max-h-[450px]"
                      } object-contain hover:scale-105 transition-transform duration-200 rounded shadow-md `}
                      onError={(e) => {
                        e.currentTarget.alt = "图片缺失";
                      }}
                    />
                  </div>
                </a>
                {/* 图片标题 */}
                <div className="px-4 pb-4 ">
                  {image.title && (
                    <div className="  pt-1 rounded-b-lg">
                      <p
                        className={`${
                          isFullscreen ? "text-sm" : "text-xs"
                        }  text-gray-800  font-medium `}
                        title={image.title}
                      >
                        {image.title}
                      </p>
                    </div>
                  )}
                  {image.description && (
                    <div className="  pt-1 rounded-b-lg">
                      <p
                        className={`${
                          isFullscreen ? "text-sm" : "text-xs"
                        }  text-gray-700  font-medium`}
                        title={image.description}
                      >
                        {image.description}
                      </p>
                    </div>
                  )}
                  {(image.address || image.date || image.source) && (
                    <div className="  pt-1 rounded-b-lg">
                      <p
                        className={`${
                          isFullscreen ? "text-sm" : "text-xs"
                        }  text-gray-500  font-medium`}
                      >
                        {image.date || ""} {image.address || ""}
                        {image.source || ""}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {data?.categoryUrl && (
          <a
            href={data.categoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>查看更多</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
};
