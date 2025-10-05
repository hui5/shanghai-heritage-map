/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { LocationInfo } from "../../../../helper/map-data/LocationInfo";
import { AIStreamingDisplay } from "./AIStreamingDisplay";

interface DetailedInfoModalProps {
	isOpen: boolean;
	onClose: () => void;
	locationInfo: LocationInfo;
}

export const DetailedInfoModal: React.FC<DetailedInfoModalProps> = ({
	isOpen,
	onClose,
	locationInfo,
}) => {
	const { name, address, coordinates, properties } = locationInfo;
	const [requestData, setRequestData] = useState<any>(null);

	// 当模态框打开时准备请求数据
	useEffect(() => {
		if (isOpen) {
			setRequestData({
				name,
				address,
				coordinates,
				properties,
			});
		} else {
			// 模态框关闭时重置状态
		}
	}, [isOpen, coordinates, name, address, properties]);

	// ESC 键关闭功能
	useEffect(() => {
		const handleEscapeKey = (event: KeyboardEvent) => {
			if (event.key === "Escape" && isOpen) {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener("keydown", handleEscapeKey);
		}

		return () => {
			document.removeEventListener("keydown", handleEscapeKey);
		};
	}, [isOpen, onClose]);

	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	if (!isOpen) return null;

	const mainModalContent = (
		<div
			className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50 p-4"
			onClick={handleBackdropClick}
		>
			<div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[90vh] overflow-hidden transition-all duration-300 flex flex-col relative z-50">
				{/* 头部 */}
				<div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
					<div className="flex items-center gap-2">
						<h2 className="text-base font-bold text-gray-700">
							{name || "地点详情"}
						</h2>
						{address && (
							<span className="text-sm text-gray-600">📍 {address}</span>
						)}
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 transition-colors"
					>
						<svg
							className="w-6 h-6"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<title>关闭</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				{/* 主要内容区域 - 原有 AI 分析 */}
				<div className="flex-1 p-6 overflow-hidden">
					<AIStreamingDisplay
						key={`${coordinates?.[0]}-${coordinates?.[1]}-${name || "unknown"}`}
						requestData={requestData}
						isOpen={isOpen}
					/>
				</div>

				{/* 底部按钮 */}
				<div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
					<button
						type="button"
						onClick={onClose}
						className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
					>
						关闭
					</button>
				</div>
			</div>
		</div>
	);

	// 计算三列布局的位置 - 确保并列显示且有间隙
	const centerWidth = 672; // max-w-2xl 的实际宽度
	const gap = 30; // 间隙
	const wikipediaWidth = 330; // Wikipedia 固定较窄宽度

	// 左侧 Wikipedia 弹出框 (固定较窄宽度)
	const leftModal = (
		<div
			className="hidden lg:block fixed top-[5vh] h-[90vh] z-50 overflow-y-auto"
			style={{
				maxWidth: `${wikipediaWidth}px`,
				right: `calc(50% + ${centerWidth / 2}px + ${gap}px)`,
			}}
			onClick={handleBackdropClick}
		></div>
	);

	// 右侧 Wikicommons 弹出框 (灵活宽度，适合图片显示)
	const rightModal = (
		<div
			className="hidden lg:block fixed top-[5vh] h-[80vh] z-50 overflow-y-auto"
			style={{
				left: `calc(50% + ${centerWidth / 2}px + ${gap}px)`,
				right: "16px",
				maxWidth: "480px",
				minWidth: "380px",
			}}
			onClick={handleBackdropClick}
		></div>
	);

	// 使用 portal 渲染所有内容到 body
	return createPortal(
		<>
			{/* {leftModal} */}
			{mainModalContent}
			{/* {rightModal} */}
		</>,
		document.body,
	);
};

export default DetailedInfoModal;
