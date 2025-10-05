/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */
import { Clock, MapPin, Search, Star, X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

// 搜索结果类型定义
export interface SearchResult {
	id: string;
	name: string;
	address?: string;
	type: string;
	coordinates: [number, number];
	source: "buildings" | "historical";
	properties?: Record<string, any>;
	description?: string;
	matchScore?: number;
	subtypeId?: string; // 添加subtypeId字段，用于历史数据
}

interface MapSearchProps {
	onResultSelect: (result: SearchResult) => void;
	onHighlightMultipleResults: (
		results: SearchResult[],
		searchMode: boolean,
	) => void;
	isSearchActive: boolean;
	searchData: {
		buildings: any[];
		historical: any[];
	};
}

export const MapSearch: React.FC<MapSearchProps> = ({
	onResultSelect,
	onHighlightMultipleResults,
	isSearchActive,
	searchData,
}) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [results, setResults] = useState<SearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [searchHistory, setSearchHistory] = useState<string[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0); // 默认选中第一个
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [isExpanded, setIsExpanded] = useState(false); // 控制输入框展开状态
	const [isFocused, setIsFocused] = useState(false); // 搜索框是否聚焦

	// 从localStorage加载搜索历史
	useEffect(() => {
		const saved = localStorage.getItem("map-search-history");
		if (saved) {
			try {
				setSearchHistory(JSON.parse(saved));
			} catch (e) {
				console.warn("Failed to load search history:", e);
			}
		}
	}, []);

	// 生成智能建议
	const generateSuggestions = useMemo(() => {
		const allNames = new Set<string>();

		// 从建筑数据提取名称 - 使用统一格式的properties
		searchData.buildings.forEach((building) => {
			const props = building.properties;
			if (props.name) allNames.add(props.name);
			if (props.type) allNames.add(props.type);
			if (props.address) {
				// 提取地址中的路名和区域名
				const addressParts = props.address.split(/[路街道区县市]/);
				addressParts.forEach((part: string) => {
					if (part && part.length > 1) {
						allNames.add(part.trim());
					}
				});
			}
		});

		// 从历史数据提取名称
		searchData.historical.forEach((feature) => {
			if (feature.properties?.name) allNames.add(feature.properties.name);
			if (feature.properties?.itemLabel)
				allNames.add(feature.properties.itemLabel);
			if (feature.properties?.title) allNames.add(feature.properties.title);
		});

		return Array.from(allNames)
			.filter((name) => name.length > 1)
			.sort();
	}, [searchData]);

	// 获取搜索建议
	const getSearchSuggestions = useCallback(
		(query: string): string[] => {
			if (!query.trim()) return [];

			const queryLower = query.toLowerCase();
			return generateSuggestions
				.filter((name) => name.toLowerCase().includes(queryLower))
				.slice(0, 5);
		},
		[generateSuggestions],
	);

	// 保存搜索历史到localStorage
	const saveToHistory = useCallback((query: string) => {
		if (!query.trim()) return;

		setSearchHistory((prev) => {
			const newHistory = [
				query,
				...prev.filter((item) => item !== query),
			].slice(0, 10);
			localStorage.setItem("map-search-history", JSON.stringify(newHistory));
			return newHistory;
		});
	}, []);

	// 搜索算法实现
	const performSearch = useCallback(
		(query: string): SearchResult[] => {
			if (!query.trim()) return [];

			const searchTerm = query.toLowerCase().trim();
			const allResults: SearchResult[] = [];

			// 搜索建筑数据 - 使用统一格式的properties
			searchData.buildings.forEach((building) => {
				const props = building.properties;
				const searchableFields = [
					props.name,
					props.address,
					props.type,
					props.description,
					...(Array.isArray(props.csv_names)
						? props.csv_names
						: typeof props.csv_names === "string"
							? [props.csv_names]
							: []),
				].filter(Boolean);

				let matchScore = 0;
				let foundMatch = false;

				searchableFields.forEach((field) => {
					if (typeof field === "string") {
						const fieldLower = field.toLowerCase();
						if (fieldLower.includes(searchTerm)) {
							foundMatch = true;
							// 精确匹配得分更高
							if (fieldLower === searchTerm) {
								matchScore += 100;
							} else if (fieldLower.startsWith(searchTerm)) {
								matchScore += 80;
							} else {
								matchScore += 50;
							}
						}
					}
				});

				if (foundMatch && building.geometry?.coordinates) {
					allResults.push({
						id: `building-${props.uri || Math.random()}`,
						name: props.name || "未知建筑",
						address: props.address,
						type: props.type || "建筑",
						coordinates: building.geometry.coordinates,
						source: "buildings",
						properties: props,
						description: props.description,
						matchScore,
					});
				}
			});

			// 搜索历史数据 (GeoJSON features)
			searchData.historical.forEach((feature) => {
				if (
					feature.type === "Feature" &&
					feature.geometry &&
					feature.properties
				) {
					const props = feature.properties;
					const searchableFields = [
						props.name,
						props.itemLabel,
						props.title,
						props.address,
						props.location,
						props.description,
						props.itemDescription,
						...(Array.isArray(props.csv_names)
							? props.csv_names
							: typeof props.csv_names === "string"
								? [props.csv_names]
								: []),
					].filter(Boolean);

					let matchScore = 0;
					let foundMatch = false;

					searchableFields.forEach((field) => {
						if (typeof field === "string") {
							const fieldLower = field.toLowerCase();
							if (fieldLower.includes(searchTerm)) {
								foundMatch = true;
								if (fieldLower === searchTerm) {
									matchScore += 100;
								} else if (fieldLower.startsWith(searchTerm)) {
									matchScore += 80;
								} else {
									matchScore += 50;
								}
							}
						}
					});

					if (foundMatch && feature.geometry.type === "Point") {
						const coords = feature.geometry.coordinates;
						allResults.push({
							id: `historical-${props.id || Math.random()}`,
							name: props.name || props.itemLabel || props.title || "未知地点",
							address: props.address || props.location || "",
							type: "历史地点",
							coordinates: coords,
							source: "historical",
							properties: props,
							description: props.description || props.itemDescription,
							matchScore,
							subtypeId: props.dataSource || "historical_locations", // 添加subtypeId
						});
					}
				}
			});

			// 按匹配分数排序，并限制结果数量
			return allResults
				.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
				.slice(0, 20);
		},
		[searchData],
	);

	// 处理结果选择
	const handleResultSelect = useCallback(
		(result: SearchResult) => {
			saveToHistory(result.name);
			onResultSelect(result);
			// 不清空搜索框和结果，保持界面展开
			// setSearchQuery("");
			// setResults([]);
			// setIsExpanded(false);
		},
		[onResultSelect, saveToHistory],
	);

	// 搜索状态变化通知
	const shouldShowSearchMode =
		isFocused || isExpanded || searchQuery.length > 0;

	// 通知父组件搜索状态变化
	useEffect(() => {
		if (shouldShowSearchMode) {
			onHighlightMultipleResults(results, true); // 显示当前搜索结果
		} else {
			onHighlightMultipleResults([], false); // 清除高亮
		}
	}, [shouldShowSearchMode, results, onHighlightMultipleResults]);

	// 处理搜索输入
	const handleSearch = useCallback(
		(query: string) => {
			setSearchQuery(query);
			setSelectedIndex(0); // 重置为第一个选项

			if (!query.trim()) {
				setResults([]);
				setSuggestions([]);
				setIsSearching(false);
				setIsExpanded(false);
				return;
			}

			setIsExpanded(true); // 有内容时展开

			// 更新建议
			const newSuggestions = getSearchSuggestions(query);
			setSuggestions(newSuggestions);

			setIsSearching(true);

			// 使用防抖来避免过度搜索
			const timeoutId = setTimeout(() => {
				const searchResults = performSearch(query);
				setResults(searchResults);
				setIsSearching(false);
			}, 500); // 增加防抖时间，给用户更多输入时间

			return () => clearTimeout(timeoutId);
		},
		[performSearch, getSearchSuggestions],
	);

	// 处理历史记录选择
	const handleHistorySelect = useCallback(
		(historyItem: string) => {
			setSearchQuery(historyItem);
			handleSearch(historyItem);
		},
		[handleSearch],
	);

	// 关闭搜索
	const handleCloseSearch = useCallback(() => {
		setSearchQuery("");
		setResults([]);
		setSuggestions([]);
		setIsExpanded(false);
		setIsFocused(false);
		// 不需要手动清除高亮，useEffect会自动处理
	}, []);

	// 键盘导航
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			const totalItems =
				results.length > 0 ? results.length : suggestions.length;

			if (e.key === "ArrowDown") {
				e.preventDefault();
				const newIndex = Math.min(selectedIndex + 1, totalItems - 1);
				setSelectedIndex(newIndex);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				const newIndex = Math.max(selectedIndex - 1, 0);
				setSelectedIndex(newIndex);
			} else if (e.key === "Enter") {
				e.preventDefault();
				if (results.length > 0 && results[selectedIndex]) {
					handleResultSelect(results[selectedIndex]);
				} else if (suggestions.length > 0 && suggestions[selectedIndex]) {
					handleHistorySelect(suggestions[selectedIndex]);
				}
			} else if (e.key === "Escape") {
				handleCloseSearch();
			}
		},
		[
			results,
			suggestions,
			selectedIndex,
			handleResultSelect,
			handleHistorySelect,
			handleCloseSearch,
		],
	);

	// 鼠标悬停高亮和选择
	const handleMouseEnter = useCallback(
		(result: SearchResult, index: number) => {
			setSelectedIndex(index);
		},
		[],
	);

	const handleMouseLeave = useCallback(() => {
		// 不再自动清除高亮，保持当前选中项的高亮状态
		// onHighlightResult(null);
	}, []);

	// 鼠标点击选择
	const handleMouseClick = useCallback(
		(result: SearchResult) => {
			handleResultSelect(result);
		},
		[handleResultSelect],
	);

	// 清空搜索历史
	const clearHistory = useCallback(() => {
		setSearchHistory([]);
		localStorage.removeItem("map-search-history");
	}, []);

	return (
		<div className="absolute top-4 left-4 z-20 w-80">
			<div
				className={`  ${
					searchQuery || isExpanded
						? "bg-white  shadow-lg border border-gray-200"
						: "bg-white/50"
				} rounded-lg `}
			>
				{/* 搜索输入框 */}
				<div className="relative">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => handleSearch(e.target.value)}
						onKeyDown={handleKeyDown}
						onFocus={() => {
							setIsFocused(true);
							setIsExpanded(true);
						}}
						onBlur={() => {
							// 延迟设置失焦，给点击操作时间
							setTimeout(() => setIsFocused(false), 200);
						}}
						placeholder="搜索地点..."
						className={`w-full pl-9 pr-10 py-2.5 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 placeholder-gray-500 ${
							searchQuery || isExpanded ? "bg-white" : "bg-white/10"
						}`}
					/>
					{/* 关闭图标 */}
					{(searchQuery || isExpanded) && (
						<button
							type="button"
							onClick={handleCloseSearch}
							className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
							title="关闭搜索 (ESC)"
						>
							<X className="h-4 w-4" />
						</button>
					)}
				</div>

				{/* 搜索结果 - 仅在展开时显示 */}
				{isExpanded && searchQuery && (
					<div className="border-t border-gray-100 max-h-72 overflow-y-auto">
						{isSearching ? (
							<div className="p-3 text-center text-gray-500 text-sm">
								<div className="animate-spin inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full mr-2"></div>
								搜索中...
							</div>
						) : results.length > 0 ? (
							<div className="py-1">
								{results.map((result, index) => (
									<div
										key={result.id}
										className={`px-3 py-2 cursor-pointer transition-colors text-sm ${
											index === selectedIndex
												? "bg-blue-50 border-l-2 border-blue-500"
												: "hover:bg-gray-50"
										}`}
										onClick={() => handleMouseClick(result)}
										onMouseEnter={() => handleMouseEnter(result, index)}
										onMouseLeave={handleMouseLeave}
									>
										<div className="flex items-center space-x-2">
											<MapPin className="h-3 w-3 text-blue-500 flex-shrink-0" />
											<div className="flex-1 min-w-0">
												<div className="font-medium text-gray-900 truncate text-sm">
													{result.name}
												</div>
												{result.address && (
													<div className="text-xs text-gray-500 truncate">
														{result.address}
													</div>
												)}
											</div>
											<span
												className={`text-xs px-1.5 py-0.5 rounded text-xs ${
													result.source === "buildings"
														? "bg-green-100 text-green-600"
														: result.source === "historical"
															? "bg-blue-100 text-blue-600"
															: "bg-purple-100 text-purple-600"
												}`}
											>
												{result.source === "buildings"
													? "建筑"
													: result.source === "historical"
														? "历史"
														: "Wiki"}
											</span>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="p-3 text-center text-gray-500 text-sm">
								未找到相关结果
							</div>
						)}

						{/* 操作提示 */}
						{/* {results.length > 0 && (
              <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
                <div className="text-xs text-gray-500">
                  💡 ↑↓ 选择，Enter 确认，Esc 关闭
                </div>
              </div>
            )} */}
					</div>
				)}

				{/* 搜索建议 */}
				{isExpanded &&
					searchQuery &&
					suggestions.length > 0 &&
					results.length === 0 &&
					!isSearching && (
						<div className="border-t border-gray-100">
							<div className="px-3 py-1.5 text-xs text-gray-500 bg-gray-50">
								建议
							</div>
							<div className="py-1">
								{suggestions.map((suggestion, index) => (
									<div
										key={suggestion}
										className={`px-3 py-2 cursor-pointer transition-colors text-sm ${
											index === selectedIndex
												? "bg-blue-50 border-l-2 border-blue-500"
												: "hover:bg-gray-50"
										}`}
										onClick={() => handleHistorySelect(suggestion)}
									>
										<div className="flex items-center space-x-2">
											<Search className="h-3 w-3 text-gray-400" />
											<span className="text-gray-700">{suggestion}</span>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

				{/* 搜索历史 */}
				{isExpanded && !searchQuery && searchHistory.length > 0 && (
					<div className="border-t border-gray-100">
						<div className="px-3 py-1.5 text-xs text-gray-500 bg-gray-50 flex items-center justify-between">
							<span>历史</span>
							<button
								type="button"
								onClick={clearHistory}
								className="text-blue-500 hover:text-blue-600 text-xs"
							>
								清空
							</button>
						</div>
						<div className="py-1 max-h-32 overflow-y-auto">
							{searchHistory.slice(0, 5).map((item, index) => (
								<div
									key={item}
									className="px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm"
									onClick={() => handleHistorySelect(item)}
								>
									<div className="flex items-center space-x-2">
										<Clock className="h-3 w-3 text-gray-400" />
										<span className="text-gray-700">{item}</span>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default MapSearch;
