# 上海历史建筑地图:

https://shanghai-heritage-map.openda.top/

这是一个关于上海、历史、建筑的地图应用，包含上海的文保单位、优秀历史建筑、历史道路、历史交通、历史公园、名人故居等等。鼠标放在感兴趣的标签上， 能立即查询、展示相关的图文信息（维基百科、维基共享、虚拟上海、上图老照片、上图年谱、老早上海）。


### 数据

- #### 地图数据

  1. 上海图书馆开放数据平台
       - [上海年华-上海市优秀历史建筑(1086)](https://data.library.sh.cn/shnh/wkl/webapi/building/toAllBuilding)
       - [上海年华-上海市不可移动文物名录(3452)](https://data.library.sh.cn/shnh/wkl/webapi/hsly/building/toRelicDirectory)
  2. [地图书: 上海历史建筑数字地图集](https://www.ditushu.com/book/645/table)
       - 租界区 (2)
       - 风貌保护区 (12)
       - 历史公园 (31)
       - 历史交通 (铁路：3，火车站：19， 道路： 927)
       - 公共汽车 (站点：152， 线路：22)
       - 有轨电车 (站点：88， 线路：20)
       - 无轨电车 (站点：62，线路：9)
       - 历史建筑 (663)
       - 历史戏院影院 (90)
       - 《大医》上海地图 (140)
       - 《千里江山图》上海地图 (122)
       - 名人故居 (137)
       - 《今日之沪江》上海地标 (37)
       - 克-科上海地图地标 （98）
  3. [OpenStreetMap（polygon:674, ~~point:717~~）](https://overpass-turbo.eu/)
        <details><summary>查询语句</summary>

        ```sql
        /*
        Overpass API 查询 -
        */

        [out:json][timeout:120];

        // 1. 定义搜索区域
        area["name:en"="Shanghai"]->.searchArea;

        // 2. 在指定区域内执行并集查询（OR 关系）
        (
        // 原有的文化遗产和历史遗迹
        nwr["heritage"](area.searchArea);
        nwr["historic"](area.searchArea);

        // 旅游景点和标志性地点
        nw["tourism"~"^(attraction|museum|gallery|artwork|viewpoint|monument)$"][!"area"]["leisure"!="park"](area.searchArea);
        );

        // 3. 输出结果
        // 输出完整的几何信息和所有标签
        out geom;
        ```

        </details>

  4. [Wikidata(1202)](https://query.wikidata.org/)
        <details><summary>查询语句</summary>

        ```sql

        # 在上海地理范围内，查找所有文物保护单位 (由于文保单位有限， 查找范围扩大至所有含有坐标的地点)
        SELECT DISTINCT ?item ?itemLabel ?itemDescription ?coords ?heritage_statusLabel ?image ?zhwiki_url ?commons_url WHERE {

        # 核心逻辑：查找所有 ?item，其“位于行政区实体”(P131)是“上海市”(Q8686)或其下级行政区
        # *号表示递归查找，能包含所有区
        ?item wdt:P131* wd:Q8686.

        # 筛选条件：该条目必须有“坐标”(P625)属性
        ?item wdt:P625 ?coords.

        # 排除“地铁站/Metro station”（Q928830）及其子类
        MINUS { ?item wdt:P31/wdt:P279* wd:Q928830. }

        # 筛选条件：条目拥有“文物保护等级”(P1435) 属性 （可选）
        # ?item wdt:P1435 ?heritage_status .
        OPTIONAL { ?item wdt:P1435 ?heritage_status. }

        # 可选地获取图片 (P18)
        OPTIONAL { ?item wdt:P18 ?image. }

        # 可选地获取中文维基百科的链接
        OPTIONAL {
            ?zhwiki_url schema:about ?item .
            FILTER(STRSTARTS(STR(?zhwiki_url), "https://zh.wikipedia.org/"))
        }

        # 可选地获取维基共享资源的链接 (P373)
        OPTIONAL {
            ?item wdt:P373 ?commonsCategoryName.
            BIND(IRI(CONCAT("https://commons.wikimedia.org/wiki/Category:", ENCODE_FOR_URI(?commonsCategoryName))) AS ?commons_url)
        }


        # 获取标签
        SERVICE wikibase:label { bd:serviceParam wikibase:language "zh,en". }
        }

        ```

        </details>

  5. [WikiMap](https://wikimap.toolforge.org/?wp=false&cluster=false&zoom=16&lat=031.245900&lon=0121.485733)
  6. ~~[Virtual Shanghai Buildings（1803）](https://www.virtualshanghai.net/Data/Buildings)~~

- #### 查询数据

  1. 维基百科
  2. 维基共享
  3. [Virtual Shanghai Images（5860）](https://www.virtualshanghai.net/Photos/Images)
    https://github.com/hui5/VirtualShanghai-photos
  4. [上海图书馆·老照片（33397）](https://scc.library.sh.cn/#/result)
  5. [上海图书馆·年谱（16091）](https://scc.library.sh.cn/#/np/result)
  6. [老早上海（2747）](https://laozaoshanghai.com/)

### 操作

- #### 提示
  `鼠标放在地图的符号、标签上`, 左边会出现相应的提示，包含数据来源和属性。部分关联维基百科的会有维基概述。

- #### 查询
  - `鼠标放在地图的符号、标签上`，提示的左边会自动弹出查询面板，这时候，点击`鼠标左键`或按`Space`键，可以全屏展示。
  - `←`, `→` 键快速切换查询面板 tab 显示。
  - 查询面板全屏时，`Space` 键快速切换概览和 tab 显示（会自动切换到`鼠标`所在的 tab）, 鼠标`点击空白区域`快速关闭面板。

- #### Wikimap 图片
  当放大级别 zoom > 18 时， 会出现 wikimap 图片标记， 可鼠标放上去查看。 当 zoom > 20 时，会自动显示 wikimap 图片。

- #### 右键点击
  会有 Google Earth， Wayback等的菜单，点击会打开对应区域的页面。

- #### 收藏 (存储在本地浏览器)
  查询面板中的图片可以收藏、统一查看。

- #### 设置
  地图显示参数，数据图层隐藏开关，帮助文档按钮



> [!TIP]
> 手机，pad可正常访问大部分功能，可以和电脑访问互为补充。 


### 截图



#### 地图示例

- 全景
  
  ![](public/doc/image.webp)


- 老城厢
  
  ![](public/doc/20251010194215.webp)


- 外滩
  
  <img src="public/doc/20251010194513.webp" width="700" alt="screenshot">


- 武康大楼
  
  ![](public/doc/image1.webp)

- 外白渡桥
  
  ![](public/doc/20251010192539.webp)


#### 查询示例

- 黄埔公园
  
  ![](public/doc/image2.webp)

- 礼查饭店
  
  ![](public/doc/image3.webp)

- 北京路：虚拟上海
  
  <img src="public/doc/20251010190918.webp" width="700" alt="screenshot">

- 霞飞路: 虚拟上海
  
  <img src="public/doc/20251010185806.webp" width="700" alt="screenshot">


- 哈同花园：虚拟上海
  
   <img src="public/doc/20251010193346.webp" width="700" alt="screenshot">

- 外滩：
  
  
  - 虚拟上海 
    
    <img src='public/doc/20251011035310.webp' width='700'/>

    <img src='public/doc/20251011035012.webp' width='700'/>

  - 上图·照片
    
    <img src="public/doc/20251010193632.webp" width="700" alt="screenshot">


- 江海关：虚拟上海

  <img src="public/doc/20251011015231.webp" width="700" alt="screenshot">
  <img src="public/doc/20251010220509.webp" width="700" alt="screenshot">
  <img src="public/doc/20251011015858.webp" width="700" alt="screenshot">

- 百老汇大厦：维基共享
  
  <img src="public/doc/20251010222839.webp" width="500" alt="screenshot">


- 林风眠
  
  ![](public/doc/20251010191610.webp)

- 张爱玲：上图·年谱
  
  <img src="public/doc/20251010205530.webp" width="450" alt="screenshot">


- 上海图书馆： 老早上海
  
  <img src="public/doc/20251010191801.webp" width="700" alt="screenshot">

- 十六铺：老早上海
  
  <img src="public/doc/20251010223810.webp" width="600" alt="screenshot">

- 大世界：老早上海
  
  <img src="public/doc/20251010190610.webp" width="450" alt="screenshot">

- 外滩：老早上海
  
  <img src='public/doc/20251011043531.webp' width='700'/>

- 外国坟山：维基百科
  
  <img src="public/doc/20251010191226.webp" width="440" alt="screenshot">