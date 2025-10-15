import { Github, HelpCircle, X } from "lucide-react";

interface ConsoleHeaderProps {
  onClose: () => void;
  onHelpOpen: () => void;
}

export function ConsoleHeader({ onClose, onHelpOpen }: ConsoleHeaderProps) {
  return (
    <div className="border-b bg-gray-50 rounded-t-lg">
      <div className="flex items-center justify-between p-3">
        {/* 左侧按钮组 */}
        <div className="flex items-center space-x-3">
          {/* GitHub 按钮 */}
          <a
            href="https://github.com/hui5/shanghai-heritage-map.git"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="在 GitHub 查看项目"
            className="group flex items-center justify-center w-10 h-10 rounded-full bg-white/80 hover:bg-white border border-gray-200 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:border-gray-300"
            title="GitHub"
          >
            <Github className="h-5 w-5 text-gray-700 group-hover:text-gray-900 transition-colors duration-300" />
          </a>

          {/* Help 按钮 */}
          <button
            type="button"
            onClick={onHelpOpen}
            className="group flex items-center justify-center w-10 h-10 rounded-full bg-white/80 hover:bg-white border border-gray-200 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:border-gray-300"
            title="查看帮助"
            aria-label="查看帮助"
          >
            <HelpCircle className="h-5 w-5 text-gray-700 group-hover:text-blue-600 transition-colors duration-300" />
          </button>
        </div>

        {/* 右侧关闭按钮 */}
        <button
          type="button"
          onClick={onClose}
          className="group flex items-center justify-center w-10 h-10 rounded-full bg-white/80 hover:bg-red-50 border border-gray-200 hover:border-red-200 transition-all duration-300 hover:scale-110 hover:shadow-lg"
          title="关闭控制台"
          aria-label="关闭控制台"
        >
          <X className="w-5 h-5 text-gray-600 group-hover:text-red-600 transition-colors duration-300" />
        </button>
      </div>
    </div>
  );
}
