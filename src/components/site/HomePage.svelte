<script lang="ts">
	import { ArrowRight } from "lucide-svelte";
	import { onMount } from "svelte";
	import { slide, fly, fade } from "svelte/transition";
	import { caseItems } from "../../lib/cases";
	let scrollY = $state(0);

	let formData = $state({
		name: "",
		phone: "",
		email: "",
		revenue: "",
	});

	let isSubmitting = $state(false);
	let isFormComplete = $derived(
		Boolean(
			formData.name &&
				formData.phone &&
				formData.email &&
				formData.revenue,
		),
	);

	let activeDropdown = $state<string | null>(null);
	let mobileMenuOpen = $state(false);
	let revenueOptions = [
		"台幣3000萬以下（先了解）",
		"台幣3000萬～1億",
		"台幣1億以上",
	];

	function toggleDropdown(dropdown: string) {
		activeDropdown = activeDropdown === dropdown ? null : dropdown;
	}

	function scrollToAnchor(e: Event, href: string) {
		e.preventDefault();
		const target = document.querySelector(href);
		if (target) {
			// Offset by 56px (h-14) for the fixed navbar
			const y = target.getBoundingClientRect().top + window.scrollY - 56;
			window.scrollTo({ top: y, behavior: "smooth" });
			window.history.pushState(null, "", href);
		}
	}

	function toggleFaq(index: number, event: Event) {
		activeFaq = activeFaq === index ? null : index;
		if (activeFaq === index) {
			const target = (event.currentTarget as HTMLElement).closest(
				".faq-item-wrap",
			);
			if (target) {
				setTimeout(() => {
					// Add an extra 20px padding from the nav bar
					const y =
						target.getBoundingClientRect().top +
						window.scrollY -
						76;
					window.scrollTo({ top: y, behavior: "smooth" });
				}, 150); // Start scrolling midway through the slide transition
			}
		}
	}

	function selectOption(value: string, field: "revenue") {
		if (field === "revenue") {
			formData.revenue = value;
		}
		activeDropdown = null;
	}

	onMount(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Element | null;
			if (!target?.closest(".dropdown-container")) {
				activeDropdown = null;
			}
		};
		document.addEventListener("click", handleClickOutside);

		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	});
	let submitMessage = $state("");
	let submitOk = $state(false);
	const LINE_ADD_URL = "https://line.me/R/ti/p/@075dfgfv";

	/* ── GA4 事件追蹤（gtag 未載入時靜默略過）── */
	function track(event: string, params?: Record<string, unknown>) {
		if (
			typeof window !== "undefined" &&
			typeof (window as { gtag?: (...args: unknown[]) => void }).gtag ===
				"function"
		) {
			(window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
				"event",
				event,
				params ?? {},
			);
		}
	}

	const handleSubmit = async () => {
		if (!isFormComplete) {
			submitMessage = "請先完整填寫表單欄位。";
			return;
		}

		isSubmitting = true;
		submitMessage = "";
		submitOk = false;

		/* 附上六題診斷結果（有答才帶），顧問在初步評估前就有素材 */
		const diagnosis = diagQuestions
			.map((q, i) =>
				diagAnswers[i] === null
					? null
					: `${i + 1}. ${q.q} → ${q.opts[diagAnswers[i]!]}`,
			)
			.filter((x): x is string => x !== null);

		try {
			const response = await fetch("/api/contact", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...formData, diagnosis }),
			});
			const result = await response.json().catch(() => null);

			if (response.ok) {
				submitOk = true;
				track("form_submit", { diagnosis_answers: diagnosis.length });
				submitMessage =
					result?.message ??
					"已收到您的預約，我會在 1 個工作天內與您聯繫。";
				formData = {
					name: "",
					phone: "",
					email: "",
					revenue: "",
				};
			} else {
				submitMessage = result?.message ?? "提交失敗，請稍後再試。";
			}
		} catch {
			submitMessage = "發生錯誤，請稍後再試。";
		}

		isSubmitting = false;
	};

	/* ── Chat demo：捲到可視範圍才開始播放，訊息逐則從下方推入 ── */
	let chatStep = $state(0);
	let chatBody: HTMLDivElement | undefined = $state();
	const CHAT_STEP_DELAYS = [
		200, 700, 1800, 3200, 5000, 6700, 8300, 9200, 10200, 11300, 12400,
	];

	function chatScrollBottom(smooth: boolean) {
		requestAnimationFrame(() => {
			chatBody?.scrollTo({
				top: chatBody.scrollHeight,
				behavior: smooth ? "smooth" : "auto",
			});
		});
	}

	function chatPlay(node: HTMLElement) {
		const timers: ReturnType<typeof setTimeout>[] = [];
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (!entry.isIntersecting) return;
					observer.unobserve(entry.target);
					const reduced = window.matchMedia(
						"(prefers-reduced-motion: reduce)",
					).matches;
					if (reduced) {
						chatStep = CHAT_STEP_DELAYS.length;
						chatScrollBottom(false);
						return;
					}
					CHAT_STEP_DELAYS.forEach((d, i) =>
						timers.push(
							setTimeout(() => {
								chatStep = i + 1;
								chatScrollBottom(true);
							}, d),
						),
					);
				});
			},
			{ threshold: 0.35 },
		);
		observer.observe(node);
		return {
			destroy: () => {
				observer.disconnect();
				timers.forEach(clearTimeout);
			},
		};
	}

	/* ── Scroll-reveal action ── */
	function reveal(node: HTMLElement) {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add("visible");
						observer.unobserve(entry.target);
					}
				});
			},
			{ threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
		);
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	}

	const navLinks = [
		{ href: "#problem", label: "常見情境" },
		{ href: "#diagnosis", label: "自我診斷" },
		{ href: "#services", label: "服務" },
		{ href: "#cases", label: "案例" },
		{ href: "#about", label: "關於" },
		{ href: "#price", label: "合作流程" },
		{ href: "/articles", label: "文章" },
	];

	/* ── 02 常見情境 ── */
	const situations = [
		{
			t: "想找一個全才",
			d: "會計、報稅、出納、分析，你要的是一個人全包。",
		},
		{
			t: "找不到，留不住",
			d: "經驗夠的不缺工作；願意來的多半資淺，帶起來又留不住。",
		},
		{
			t: "外包給記帳事務所",
			d: "以申報為主，照本宣科，跟不上你的模式。",
		},
		{
			t: "乾脆自己扛",
			d: "現金、報表、流程、稅負，處處卡關。",
		},
		{
			t: "拖著，等有空再說",
			d: "截止日一到，一漏就挨罰。",
		},
	];

	/* ── 03 老闆的日常 ── */
	const voices = [
		"帳上有錢，但不敢花。",
		"明明有賺，錢不知道去哪。",
		"報表看完，不知道要幹嘛。",
		"每個決定都要等會計回覆。",
		"財務一走，帳就斷一個月。",
		"幾家公司之間的錢，說不清楚。",
	];

	/* ── 04 六題診斷 ── */
	const diagQuestions = [
		{
			q: "管理報表和報稅財報，數字對得起來嗎？",
			opts: ["對得起來", "大致上", "兩套各說各話"],
		},
		{
			q: "上個月的損益，你是幾號看到的？",
			opts: ["10 日前", "月底前", "不一定／更晚"],
		},
		{
			q: "財務今天離職，下個月的帳誰接？",
			opts: ["有人接，有交接", "有人頂，沒交接", "沒人接，會斷"],
		},
		{
			q: "幾家公司之間的資金往來，有沒有一套講得出口的說法？",
			opts: ["有，寫下來了", "有共識沒文件", "沒有／只有一家"],
		},
		{
			q: "你看報表是在看結果，還是在做決定？",
			opts: ["會改變決定", "參考用", "看完就收起來"],
		},
		{
			q: "現在這套財務做法是幾年前定的？那時候的生意跟現在一樣嗎？",
			opts: ["近一年檢視過", "兩三年前", "從開公司到現在"],
		},
	];
	let diagAnswers = $state<(number | null)[]>([
		null,
		null,
		null,
		null,
		null,
		null,
	]);
	const diagAnswered = $derived(
		diagAnswers.filter((a) => a !== null).length,
	);
	let diagScrolled = false;
	let diagVerdictEl: HTMLDivElement | undefined = $state();
	function selectDiag(qi: number, oi: number) {
		diagAnswers[qi] = oi;
		if (!diagScrolled && diagAnswers.every((a) => a !== null)) {
			diagScrolled = true;
			track("diagnosis_complete", { right_count: diagRightCount });
			/* 等判讀區塊 transition 展開後再捲過去 */
			setTimeout(() => {
				diagVerdictEl?.scrollIntoView({
					behavior: "smooth",
					block: "center",
				});
			}, 300);
		}
	}
	const diagRightCount = $derived(
		diagAnswers.filter((a) => a !== null && a >= 1).length,
	);
	const diagVerdict = $derived.by(() => {
		if (diagAnswered < diagQuestions.length) return null;
		if (diagRightCount <= 1) {
			return {
				title: "執行層大致穩了。",
				body: "六題大多答得出來，值得留意的是最後一題——這套做法是什麼時候定的？生意變了，方針有沒有跟上。財務健檢可以幫你檢視這件事。",
			};
		}
		if (diagRightCount <= 3) {
			return {
				title: "有幾題落在中間：說得出來，但沒寫下來。",
				body: "沒寫下來的方針，會計有會計的答案、業務有業務的答案，你有你的答案——口徑就是從這裡開始分岔的。財務健檢會幫你把這幾題的答案定出來、寫下來。",
			};
		}
		return {
			title: "問題可能不在執行層。",
			body: "往右的答案越多，越可能缺的不是人，而是還沒被回答與寫下的財務方針。財務健檢會把你的現況攤開，定出這些答案與補的順序。",
		};
	});

	/* ── 07 服務與定位 ── */
	const serviceLayers = [
		{
			lv: "決策層",
			tag: "奕成的位置",
			on: true,
			sub: "分析・治理・資本",
			items: "交易模式規劃・月報與財務分析・預算編制・財務指標追蹤・現金流預測・股權結構與集團控股架構・募資與融資規劃",
			who: "大型事務所顧問／外部 CFO 也在這層——但通常不碰底下的帳與流程，建議給完就結束",
		},
		{
			lv: "溝通層",
			tag: "可與會計師協作",
			on: false,
			sub: "對內外的報告與窗口",
			items: "申報資料整理・會計師與主管機關窗口・董事會／股東會・銀行與投資人往來・管理層報告",
			who: "記帳事務所／記帳士主要在這一層",
		},
		{
			lv: "紀錄層",
			tag: "可代管",
			on: false,
			sub: "帳務與營運",
			items: "記帳・出納・資金調度・請款核決・零用金・薪資（勞健保）・檔案管理",
			who: "記帳事務所／記帳士；自聘一位財務，多半也卡在這一層",
		},
	];

	/* ── 09 月報範例 ── */
	const reportWhy = [
		{
			t: "一頁看完",
			d: "老闆頁摘要在最前面，不用翻到後面找。",
		},
		{
			t: "看完就知道要做什麼",
			d: "需注意事項給 P1／P2 排序過的行動，不是列現象。",
		},
		{
			t: "每個數字都有比較基準",
			d: "對上月、對預算，差異自己跳出來。",
		},
	];
	const reportKpis = [
		{ l: "當月營收", v: "520 萬", d: "▲ 2% vs 上月", up: true },
		{ l: "毛利率", v: "34%", d: "▲ 2pp vs 上月", up: true },
		{ l: "當月淨利", v: "38 萬", d: "▲ 12% vs 上月", up: true },
		{ l: "期末現金", v: "310 萬", d: "優於預期 60 萬", up: true },
	];
	const reportChartLabels = [
		"營收：實際 vs 預算　＋　毛利率",
		"現金水位：實際 vs 預算",
		"淨利：實際 vs 預算　＋　淨利率",
	];
	let rptChart = $state(0);
	const reportPl = [
		{ k: "營收 Revenue", m: "5,200", p: "5,090", y: "30,400" },
		{ k: "銷貨成本 COGS", m: "(3,430)", p: "(3,480)", y: "(20,500)", neg: true },
		{ k: "毛利 Gross Profit", m: "1,770", p: "1,610", y: "9,900" },
		{ k: "營業費用 OPEX", m: "(1,320)", p: "(1,220)", y: "(7,800)", neg: true },
		{ k: "業外收支 Other", m: "(70)", p: "(50)", y: "(250)", neg: true },
	];

	/* ── 10 客戶案例（簡報版）── */
	const featuredCases = [
		{
			ix: "01",
			name: "新創公司A",
			tags: ["早期新創", "卡在紀錄層"],
			sit: "原會計離職、帳務只有銀行流水帳，關係人金流混亂，找不到接手。",
			how: "依商業模式重建年度損益與現金預算，並建立專案別損益，讓每個專案可以單獨判斷該不該做。往下才把帳轉成應付基礎、釐清關係人往來——數字要撐得起這些判斷。",
			res: [
				"現金流預測提早示警，防止年中資金斷鏈危機",
				"每個專案盈虧一目瞭然",
			],
		},
		{
			ix: "02",
			name: "中小企業H",
			tags: ["已有會計團隊", "卡在溝通層"],
			sit: "有會計團隊卻撐不起決策——入帳規則不一、報表只為財稅、部門損益拆不開。",
			how: "盤點融資租賃、銀行貸款與私人借款的整體資金結構，提出債務整合方案；並拆出各事業部的損益與利潤貢獻。往下重設含管理維度的科目表、統一入帳規則、清掉舊掛帳。",
			res: [
				"一年省下 600 萬以上利息費用",
				"各事業部的利潤貢獻看得見",
			],
		},
	];

	/* ── 11 下一步 ── */
	const evalItems = [
		"了解你的商業模式，與目前財務的實際做法",
		"對照三層架構，看你現在卡在哪一層",
		"判斷是否適合進入財務健檢，以及下一步怎麼走",
	];
	const nextSteps = [
		{
			n: "STEP 1",
			t: "初步評估",
			d: "了解你的生意與財務現況，判斷是否適合。",
			hl: true,
		},
		{
			n: "STEP 2",
			t: "框架提案",
			d: "財務健檢，定出財務方針與導入順序。",
			hl: false,
		},
		{
			n: "STEP 3",
			t: "導入與口徑對齊",
			d: "紀錄層的串接——把方針落到帳、流程與系統欄位上。",
			hl: false,
		},
		{
			n: "STEP 4",
			t: "每月財務治理",
			d: "進入決策層——固定月報＋月會，數字開始改變決定。",
			hl: false,
		},
	];
	/* ── FAQ ── */
	function easeOutCubic(t: number) {
		return 1 - Math.pow(1 - t, 3);
	}
	let activeFaq = $state<number | null>(null);
	const faqItems = [
		{
			q: "我已經有會計了，還需要嗎？",
			a:
				"需要。會計與報稅照原本流程走，我們補上財務治理、管理分析與決策追蹤。" +
				"每月會把重點數字整理好，老闆可以直接拿來開會和決策。",
		},
		{
			q: "帳很亂可以合作嗎？",
			a:
				"可以，這很常見。我們會先做財務健檢，先看目前帳務能不能支撐管理，" +
				"再安排導入順序，把月結節奏和科目定義固定下來。",
		},
		{
			q: "每月實際會交付什麼？",
			a:
				"每個月固定跑完一個循環：T+3 關帳與檢核、T+5 出月報（損益、現金、KPI、實際 vs 預算）、" +
				"之後第一個週一開一小時月報討論，會後的決定變成有負責人、有期限的追蹤項目。",
		},
		{
			q: "最短合作期間多久？",
			a:
				"建議以 6 個月為一個治理週期。前期先把規則與報表架起來，後續就能穩定追蹤與優化決策品質；" +
				"若交付內容與約定不符，可依合約終止。",
		},
		{
			q: "現在很多公司都在用 AI 記帳、AI 分析，你們還能幫上什麼？",
			a:
				"AI 工具可以加快整理與產出。真正卡住的通常是資料來源分散、規則不一致、歷史帳務沒清乾淨。" +
				"我們會先把這些底層問題處理好，再把報表和決策會議接起來，讓 AI 產出的數字可以直接拿來做經營判斷、融資溝通和每月追蹤。",
		},
		{
			q: "資料會保密嗎？",
			a:
				"會。合約包含完整保密條款，資料僅由授權人員在必要範圍內使用。原始可識別資料只用於本案交付；" +
				"若用於洞察分析，僅使用去識別化與彙總資料，且不影響你的服務權益。",
		},
		{
			q: "你們跟會計師事務所有什麼差別？",
			a:
				"會計師事務所主要處理法遵申報與簽證，我們主要處理經營治理與決策支持。" +
				"多數案件會一起合作，分工很清楚。",
		},
	];
</script>


<svelte:window bind:scrollY />

<div class="min-h-screen bg-transparent relative z-0 overflow-hidden">
	<!-- ─── NAV ─── -->
	<nav
		class="fixed top-0 inset-x-0 z-50 transition-all duration-300 {scrollY >
			20 || mobileMenuOpen
			? 'bg-white/95 backdrop-blur-md border-b border-[var(--line)] shadow-sm'
			: 'bg-transparent border-b border-transparent shadow-none'}"
	>
		<div
			class="max-w-[980px] mx-auto px-6 h-14 flex items-center justify-between"
		>
			<a href="/" aria-label="奕成財創" class="flex items-center">
				<img src="/yclogo.svg" alt="奕成財創 Logo" class="h-5 w-auto" />
			</a>
			<div class="hidden md:flex items-center gap-8">
				{#each navLinks as link}
					<a
						href={link.href}
						class="nav-link"
						onclick={(e) => link.href.startsWith("#") && scrollToAnchor(e, link.href)}
						>{link.label}</a
					>
				{/each}
			</div>
			<a
				href="#contact"
				class="nav-cta hidden md:block"
				onclick={(e) => {
					track("cta_click", { location: "nav" });
					scrollToAnchor(e, "#contact");
				}}>預約初步評估</a
			>
			<!-- 漢堡按鈕 (手機版) -->
			<button
				class="md:hidden flex flex-col justify-center gap-[5px] p-2 -mr-2"
				onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
				aria-label={mobileMenuOpen ? "關閉選單" : "開啟選單"}
				aria-expanded={mobileMenuOpen}
			>
				<span
					class="block w-5 h-px bg-[var(--ink)] transition-all duration-300 origin-center {mobileMenuOpen
						? 'rotate-45 translate-y-[6px]'
						: ''}"
				></span>
				<span
					class="block w-5 h-px bg-[var(--ink)] transition-all duration-300 {mobileMenuOpen
						? 'opacity-0'
						: ''}"
				></span>
				<span
					class="block w-5 h-px bg-[var(--ink)] transition-all duration-300 origin-center {mobileMenuOpen
						? '-rotate-45 -translate-y-[6px]'
						: ''}"
				></span>
			</button>
		</div>
		<!-- 手機版展開選單 -->
		{#if mobileMenuOpen}
			<div
				transition:slide={{ duration: 250 }}
				class="md:hidden bg-white/95 backdrop-blur-md border-b border-[var(--line)]"
			>
				<div class="max-w-[980px] mx-auto px-6 py-2 flex flex-col">
					{#each navLinks as link}
						<a
							href={link.href}
							class="nav-link py-3.5 border-b border-[var(--line)]"
							onclick={(e) => {
								if (link.href.startsWith("#")) scrollToAnchor(e, link.href);
								mobileMenuOpen = false;
							}}>{link.label}</a
						>
					{/each}
					<a
						href="#contact"
						class="nav-link py-3.5"
						onclick={(e) => {
							scrollToAnchor(e, "#contact");
							mobileMenuOpen = false;
						}}>預約初步評估</a
					>
				</div>
			</div>
		{/if}
	</nav>

	<!-- ─── HERO ─── -->
	<section
		class="hero-bg relative"
		style="height: 100vh; min-height: 620px;"
	>
		<div
			class="absolute bottom-12 left-6 right-6 md:bottom-20 md:left-16 md:right-auto text-left z-10 md:max-w-[640px]"
		>
			<p class="meta tracking-widest uppercase mb-4">
				Fractional CFO for SMBs
			</p>
			<h1
				class="hero-headline"
			>
				把財務，變成你的<span class="hero-u">槓桿</span>
			</h1>
			<p class="hero-latin">Finance isn't overhead. It's leverage.</p>
			<p class="hero-lede">
				每月固定月報＋月會的財務治理，<br
				/>讓你看得懂自己的公司、做得了決定。
			</p>
		</div>
	</section>

	<!-- ─── PROBLEM 常見情境 ─── -->
	<section
		id="problem"
		class="border-t border-[var(--line)]"
		style="padding-top: var(--sec-top); padding-bottom: var(--sec);"
	>
		<div class="wrap">
			<div class="text-center mb-[clamp(60px,7vw,100px)]">
				<h2 class="sec-title reveal" use:reveal>
					常見情境<span class="sec-en">— Situations</span>
				</h2>
				<p class="sec-intro reveal" use:reveal>
					你是否遇到了這些問題？
				</p>
			</div>

			<div
				class="max-w-[1240px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-x-8 gap-y-10"
			>
				{#each situations as s, i}
					<div class="sit-col reveal reveal-d{i}" use:reveal>
						<span class="sit-num"
							>{String(i + 1).padStart(2, "0")}</span
						>
						<h3 class="sit-title">{s.t}</h3>
						<p class="sit-desc">{s.d}</p>
					</div>
				{/each}
			</div>

			<div
				class="mt-[clamp(64px,7vw,104px)] text-center reveal"
				use:reveal
			>
				<span class="pull-quote-mark">&ldquo;</span>
				<p class="pull-quote">
					這五種情境有一個共同點——看似都是要解決<span
						class="pull-quote-em">「人」</span
					>的問題。<br />但是，真正的問題可能<span
						class="pull-quote-em">沒有被回答與定義</span
					>。
				</p>
			</div>
		</div>
	</section>

	<!-- ─── VOICES 老闆的日常 ─── -->
	<section
		class="border-t border-[var(--line)]"
		style="padding-top: var(--sec-top); padding-bottom: var(--sec);"
	>
		<div class="wrap">
			<div class="text-center mb-[clamp(60px,7vw,100px)]">
				<h2 class="sec-title reveal" use:reveal>
					老闆的日常<span class="sec-en">— Voices</span>
				</h2>
				<p class="sec-intro reveal" use:reveal>
					這幾句話，是否感同身受？
				</p>
			</div>

			<div
				class="max-w-[1080px] mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6"
			>
				{#each voices as v, i}
					<div class="quote-cell reveal reveal-d{i % 3}" use:reveal>
						<p class="quote-text">「{v}」</p>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- ─── DIAGNOSIS 六題診斷 ─── -->
	<section
		id="diagnosis"
		class="bg-[var(--paper)] border-t border-[var(--line)]"
		style="padding-top: var(--sec-top); padding-bottom: var(--sec);"
	>
		<div class="wrap">
			<div class="text-center mb-[clamp(60px,7vw,100px)]">
				<h2 class="sec-title reveal" use:reveal>
					現場診斷<span class="sec-en">— Self Check</span>
				</h2>
				<p class="sec-intro reveal" use:reveal>
					六個問題：你的答案是？<br />點選最接近現況的選項，答完看看落點。
				</p>
			</div>

			<div class="max-w-[920px] mx-auto">
				<p class="diag-progress reveal" use:reveal>
					已回答 {diagAnswered}／{diagQuestions.length}
				</p>
				{#each diagQuestions as dq, qi}
					<div class="diag-row reveal" use:reveal>
						<div class="diag-q">
							<span class="diag-num">{qi + 1}</span>
							<span class="diag-text">{dq.q}</span>
						</div>
						<div class="diag-opts">
							{#each dq.opts as opt, oi}
								<button
									type="button"
									class="diag-opt"
									class:sel={diagAnswers[qi] === oi}
									class:warn={diagAnswers[qi] === oi &&
										oi === 2}
									onclick={() => selectDiag(qi, oi)}
								>
									<i></i>
									<span>{opt}</span>
								</button>
							{/each}
						</div>
					</div>
				{/each}

				{#if diagVerdict}
					<div
						class="diag-verdict"
						bind:this={diagVerdictEl}
						transition:slide={{ duration: 400 }}
					>
						<h3>{diagVerdict.title}</h3>
						<p>{diagVerdict.body}</p>
						<a
							href="#contact"
							class="btn-primary mt-2"
							onclick={(e) => {
								track("cta_click", { location: "diagnosis" });
								scrollToAnchor(e, "#contact");
							}}
						>
							預約初步評估
							<ArrowRight class="w-3.5 h-3.5" />
						</a>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- ─── SERVICES 服務與定位 ─── -->
	<section
		id="services"
		class="bg-[var(--paper)] border-t border-[var(--line)]"
		style="padding-top: var(--sec-top); padding-bottom: var(--sec);"
	>
		<div class="wrap">
			<div class="text-center mb-[clamp(60px,7vw,100px)]">
				<h2 class="sec-title reveal" use:reveal>
					服務與定位<span class="sec-en">— Services</span>
				</h2>
				<p class="sec-intro reveal" use:reveal>
					三層都能接，但只有最上面那層會改變你的決定。<br
					/>下面兩層可以代管或協作，也能和你現有的會計並行——但補滿了，數字仍然只是紀錄。
				</p>
			</div>

			<div
				class="max-w-[1080px] mx-auto grid md:grid-cols-[340px_1fr] gap-[clamp(36px,4vw,64px)] items-center"
			>
				<div class="reveal svc-fig" use:reveal>
					<svg viewBox="0 0 300 236" role="img" aria-label="服務三層金字塔：決策層（奕成在這裡）、溝通層、紀錄層">
						<polygon
							points="106,8 194,8 222,76 78,76"
							fill="#1F9EC4"
							stroke="#164A73"
							stroke-width="2"
						/>
						<text
							x="150"
							y="43"
							text-anchor="middle"
							fill="#fff"
							font-size="17"
							font-weight="600"
							font-family="Noto Serif TC, serif">決策層</text
						>
						<text
							x="150"
							y="63"
							text-anchor="middle"
							fill="#fff"
							font-size="10.5"
							font-weight="600"
							letter-spacing="1"
							opacity="0.95"
							font-family="Noto Sans TC, sans-serif"
							>奕成在這裡</text
						>
						<polygon
							points="75,84 225,84 253,152 47,152"
							fill="#D7E4EC"
						/>
						<text
							x="150"
							y="125"
							text-anchor="middle"
							fill="#164A73"
							font-size="17"
							font-weight="600"
							font-family="Noto Serif TC, serif">溝通層</text
						>
						<polygon
							points="44,160 256,160 284,228 16,228"
							fill="#EEF2F5"
						/>
						<text
							x="150"
							y="201"
							text-anchor="middle"
							fill="#164A73"
							font-size="17"
							font-weight="600"
							font-family="Noto Serif TC, serif">紀錄層</text
						>
					</svg>
				</div>

				<div>
					{#each serviceLayers as l, i}
						<div
							class="svc-row reveal reveal-d{i}"
							class:on={l.on}
							use:reveal
						>
							<div class="svc-row-head">
								<span class="svc-lv">{l.lv}</span>
								<span class="svc-tag" class:on={l.on}
									>{l.tag}</span
								>
							</div>
							<h4 class="svc-sub">{l.sub}</h4>
							<p class="svc-items">{l.items}</p>
							<p class="svc-who">{l.who}</p>
						</div>
					{/each}
				</div>
			</div>

			<div
				class="max-w-[860px] mx-auto mt-[clamp(56px,6vw,88px)] reveal"
				use:reveal
			>
				<div class="svc-note">
					差別不在做哪一層，在能不能串起來——決策層的決定，會<b
						>一路改到紀錄層怎麼記帳</b
					>。這件事，只有同時站在三層的位置做得到。
				</div>
			</div>
		</div>
	</section>

	<!-- ─── REPORT 月報範例 ─── -->
	<section
		class="border-t border-[var(--line)]"
		style="padding-top: var(--sec-top); padding-bottom: var(--sec);"
	>
		<div class="wrap">
			<div class="text-center mb-[clamp(48px,5vw,72px)]">
				<h2 class="sec-title reveal" use:reveal>
					月報範例<span class="sec-en">— Report Sample</span>
				</h2>
				<p class="sec-intro reveal" use:reveal>決策層長什麼樣子。<br />不是寄一份報告給你就結束——月報加月會，是每個月都會跑完的循環。</p>
			</div>

			<div class="max-w-[1080px] mx-auto grid md:grid-cols-3 gap-0 report-why reveal" use:reveal>
				{#each reportWhy as w}
					<div class="report-why-cell">
						<b>{w.t}</b>
						<span>{w.d}</span>
					</div>
				{/each}
			</div>

			<div class="max-w-[1080px] mx-auto mt-10 reveal" use:reveal>
				<div class="rpt">
					<div class="rpt-top">
						<span class="rpt-brand">○○公司 · 每月財務報告</span>
						<span class="rpt-badge">示意數據</span>
						<span class="rpt-period">報告期間：2026 年 6 月</span>
					</div>
					<div class="rpt-body">
						<div class="rpt-exec">
							<div class="rpt-box analysis">
								<h5>老闆頁摘要 · 財務分析重點</h5>
								<ul>
									<li>
										本月淨利 <b>+38 萬</b>，較上月<b
											class="g">成長 12%</b
										>，主要來自毛利率回升。
									</li>
									<li>
										營收 <b>520 萬</b>，較上月略增
										2%；主力產品線成長，抵銷淡季品項下滑。
									</li>
									<li>
										月底現金 <b>310 萬</b>，<b class="g"
											>高於預期 60 萬</b
										>，約可支應 3 個月營運。
									</li>
								</ul>
							</div>
							<div class="rpt-box watch">
								<h5>需注意事項／後續行動</h5>
								<ul>
									<li>
										<span class="wb p1">P1</span>應收逾 60
										天佔 <b>18%</b>，較上月上升，建議加強催收。
									</li>
									<li>
										<span class="wb p2">P2</span>單一客戶佔營收
										<b>42%</b>，集中度偏高，宜逐步分散。
									</li>
									<li>
										<span class="wb p2">P2</span
										>營業費用較上月增加，毛利雖回升，仍須留意費用率。
									</li>
								</ul>
							</div>
						</div>

						<div class="rpt-kpi">
							{#each reportKpis as k}
								<div class="rpt-k">
									<span class="kl">{k.l}</span>
									<span class="kv">{k.v}</span>
									<span class="kd" class:up={k.up}>{k.d}</span>
								</div>
							{/each}
						</div>

						<div class="rpt-bot">
							<div class="rpt-chart">
								<h5 class="rpt-tbl-t">
									重點圖表 · 實際 vs 預算
								</h5>
								<p class="rpt-cclab">
									{reportChartLabels[rptChart]}
								</p>
								{#if rptChart === 0}
									<svg viewBox="0 0 720 240" preserveAspectRatio="xMidYMid meet" role="img" aria-label="營收實際與預算長條圖，疊加毛利率折線"><g stroke="#eceae6" stroke-width="1"><line x1="44" y1="54.8" x2="712" y2="54.8"/><line x1="44" y1="112" x2="712" y2="112"/><line x1="44" y1="169.2" x2="712" y2="169.2"/></g><line x1="44" y1="14" x2="44" y2="210" stroke="#c9c6c0" stroke-width="1.2"/><line x1="44" y1="210" x2="712" y2="210" stroke="#c9c6c0" stroke-width="1.2"/><g fill="#034b6f"><rect x="55" y="120.2" width="15" height="89.8"/><rect x="110" y="103.8" width="15" height="106.2"/><rect x="166" y="116.1" width="15" height="93.9"/><rect x="222" y="87.5" width="15" height="122.5"/><rect x="277" y="75.2" width="15" height="134.8"/><rect x="333" y="50.8" width="15" height="159.2"/></g><g fill="#AFCEDB"><rect x="74" y="112" width="15" height="98"/><rect x="129" y="107.9" width="15" height="102.1"/><rect x="185" y="99.8" width="15" height="110.2"/><rect x="241" y="95.7" width="15" height="114.3"/><rect x="296" y="83.4" width="15" height="126.6"/><rect x="352" y="67.1" width="15" height="142.9"/><rect x="408" y="63" width="15" height="147"/><rect x="463" y="54.8" width="15" height="155.2"/><rect x="519" y="50.8" width="15" height="159.2"/><rect x="575" y="42.6" width="15" height="167.4"/><rect x="630" y="34.4" width="15" height="175.6"/><rect x="686" y="22.2" width="15" height="187.8"/></g><polyline points="72,99.8 127,83.4 183,91.6 239,63 294,50.8 350,30.3" fill="none" stroke="#1f9ec4" stroke-width="2"/><polyline points="72,112 127,99.8 183,95.7 239,83.4 294,79.3 350,75.2 406,71.2 461,69.1 517,67.1 573,65 628,63 684,61" fill="none" stroke="#1f9ec4" stroke-width="1.6" stroke-dasharray="5 4" opacity=".85"/><g fill="#1f9ec4"><circle cx="72" cy="99.8" r="2.6"/><circle cx="127" cy="83.4" r="2.6"/><circle cx="183" cy="91.6" r="2.6"/><circle cx="239" cy="63" r="2.6"/><circle cx="294" cy="50.8" r="2.6"/><circle cx="350" cy="30.3" r="2.6"/></g><g font-family="Noto Sans TC" font-size="9" fill="#9a9894" text-anchor="middle"><text x="72" y="228">1</text><text x="127" y="228">2</text><text x="183" y="228">3</text><text x="239" y="228">4</text><text x="294" y="228">5</text><text x="350" y="228">6</text><text x="406" y="228">7</text><text x="461" y="228">8</text><text x="517" y="228">9</text><text x="573" y="228">10</text><text x="628" y="228">11</text><text x="684" y="228">12</text></g><g font-family="Noto Sans TC" font-size="10"><rect x="54" y="4" width="10" height="10" fill="#034b6f"/><text x="68" y="13" fill="#76746e">實際</text><rect x="112" y="4" width="10" height="10" fill="#AFCEDB"/><text x="126" y="13" fill="#76746e">預算</text><rect x="172" y="8" width="14" height="3" fill="#1f9ec4"/><text x="190" y="13" fill="#76746e">毛利率</text><line x1="236" y1="9.5" x2="250" y2="9.5" stroke="#1f9ec4" stroke-width="2" stroke-dasharray="4 3"/><text x="254" y="13" fill="#76746e">毛利率預算</text></g></svg>
								{:else if rptChart === 1}
									<svg viewBox="0 0 720 240" preserveAspectRatio="xMidYMid meet" role="img" aria-label="現金水位實際與預算折線圖"><defs><linearGradient id="rcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#034b6f" stop-opacity=".16"/><stop offset="1" stop-color="#034b6f" stop-opacity="0"/></linearGradient></defs><g stroke="#eceae6" stroke-width="1"><line x1="44" y1="54.8" x2="712" y2="54.8"/><line x1="44" y1="112" x2="712" y2="112"/><line x1="44" y1="169.2" x2="712" y2="169.2"/></g><line x1="44" y1="14" x2="44" y2="210" stroke="#c9c6c0" stroke-width="1.2"/><line x1="44" y1="210" x2="712" y2="210" stroke="#c9c6c0" stroke-width="1.2"/><path d="M72,169.2 L127,144.7 L183,156.9 L239,107.9 L294,124.2 L350,79.3 L350,210 L72,210 Z" fill="url(#rcg)"/><polyline points="72,169.2 127,144.7 183,156.9 239,107.9 294,124.2 350,79.3" fill="none" stroke="#034b6f" stroke-width="2.4"/><g fill="#034b6f"><circle cx="72" cy="169.2" r="2.6"/><circle cx="127" cy="144.7" r="2.6"/><circle cx="183" cy="156.9" r="2.6"/><circle cx="239" cy="107.9" r="2.6"/><circle cx="294" cy="124.2" r="2.6"/><circle cx="350" cy="79.3" r="2.6"/></g><polyline points="72,156.9 127,144.7 183,132.4 239,120.2 294,107.9 350,95.7 406,87.5 461,79.3 517,71.2 573,63 628,54.8 684,46.7" fill="none" stroke="#1f9ec4" stroke-width="1.8" stroke-dasharray="5 4"/><g font-family="Noto Sans TC" font-size="9" fill="#9a9894" text-anchor="middle"><text x="72" y="228">1</text><text x="127" y="228">2</text><text x="183" y="228">3</text><text x="239" y="228">4</text><text x="294" y="228">5</text><text x="350" y="228">6</text><text x="406" y="228">7</text><text x="461" y="228">8</text><text x="517" y="228">9</text><text x="573" y="228">10</text><text x="628" y="228">11</text><text x="684" y="228">12</text></g><g font-family="Noto Sans TC" font-size="10"><rect x="54" y="8" width="14" height="3" fill="#034b6f"/><text x="72" y="13" fill="#76746e">實際</text><rect x="120" y="8" width="14" height="3" fill="#1f9ec4"/><text x="138" y="13" fill="#76746e">預算</text></g></svg>
								{:else}
									<svg viewBox="0 0 720 240" preserveAspectRatio="xMidYMid meet" role="img" aria-label="淨利實際與預算長條圖，疊加淨利率折線"><g stroke="#eceae6" stroke-width="1"><line x1="44" y1="54.8" x2="712" y2="54.8"/><line x1="44" y1="112" x2="712" y2="112"/><line x1="44" y1="169.2" x2="712" y2="169.2"/></g><line x1="44" y1="14" x2="44" y2="210" stroke="#c9c6c0" stroke-width="1.2"/><line x1="44" y1="210" x2="712" y2="210" stroke="#c9c6c0" stroke-width="1.2"/><g fill="#034b6f"><rect x="55" y="148.8" width="15" height="61.2"/><rect x="110" y="128.3" width="15" height="81.7"/><rect x="166" y="140.6" width="15" height="69.4"/><rect x="222" y="103.8" width="15" height="106.2"/><rect x="277" y="91.6" width="15" height="118.4"/><rect x="333" y="71.2" width="15" height="138.8"/></g><g fill="#AFCEDB"><rect x="74" y="140.6" width="15" height="69.4"/><rect x="129" y="132.4" width="15" height="77.6"/><rect x="185" y="128.3" width="15" height="81.7"/><rect x="241" y="116.1" width="15" height="93.9"/><rect x="296" y="103.8" width="15" height="106.2"/><rect x="352" y="87.5" width="15" height="122.5"/><rect x="408" y="83.4" width="15" height="126.6"/><rect x="463" y="75.2" width="15" height="134.8"/><rect x="519" y="71.2" width="15" height="138.8"/><rect x="575" y="63" width="15" height="147"/><rect x="630" y="54.8" width="15" height="155.2"/><rect x="686" y="42.6" width="15" height="167.4"/></g><polyline points="72,132.4 127,112 183,120.2 239,83.4 294,71.2 350,50.8" fill="none" stroke="#1f9ec4" stroke-width="2"/><polyline points="72,140.6 127,128.3 183,124.2 239,107.9 294,99.8 350,87.5 406,83.4 461,79.3 517,75.2 573,71.2 628,67.1 684,63" fill="none" stroke="#1f9ec4" stroke-width="1.6" stroke-dasharray="5 4" opacity=".85"/><g fill="#1f9ec4"><circle cx="72" cy="132.4" r="2.6"/><circle cx="127" cy="112" r="2.6"/><circle cx="183" cy="120.2" r="2.6"/><circle cx="239" cy="83.4" r="2.6"/><circle cx="294" cy="71.2" r="2.6"/><circle cx="350" cy="50.8" r="2.6"/></g><g font-family="Noto Sans TC" font-size="9" fill="#9a9894" text-anchor="middle"><text x="72" y="228">1</text><text x="127" y="228">2</text><text x="183" y="228">3</text><text x="239" y="228">4</text><text x="294" y="228">5</text><text x="350" y="228">6</text><text x="406" y="228">7</text><text x="461" y="228">8</text><text x="517" y="228">9</text><text x="573" y="228">10</text><text x="628" y="228">11</text><text x="684" y="228">12</text></g><g font-family="Noto Sans TC" font-size="10"><rect x="54" y="4" width="10" height="10" fill="#034b6f"/><text x="68" y="13" fill="#76746e">實際</text><rect x="112" y="4" width="10" height="10" fill="#AFCEDB"/><text x="126" y="13" fill="#76746e">預算</text><rect x="172" y="8" width="14" height="3" fill="#1f9ec4"/><text x="190" y="13" fill="#76746e">淨利率</text><line x1="236" y1="9.5" x2="250" y2="9.5" stroke="#1f9ec4" stroke-width="2" stroke-dasharray="4 3"/><text x="254" y="13" fill="#76746e">淨利率預算</text></g></svg>
								{/if}
								<div class="rpt-ccfoot">
									<button
										type="button"
										aria-label="上一張圖表"
										onclick={() =>
											(rptChart = (rptChart + 2) % 3)}
										>‹</button
									>
									<div class="rpt-ccdots">
										{#each reportChartLabels as _, di}
											<button
												type="button"
												class="rpt-dot"
												class:on={rptChart === di}
												aria-label={`切換到第 ${di + 1} 張圖表`}
												onclick={() => (rptChart = di)}
											></button>
										{/each}
									</div>
									<button
										type="button"
										aria-label="下一張圖表"
										onclick={() =>
											(rptChart = (rptChart + 1) % 3)}
										>›</button
									>
								</div>
							</div>

							<div class="rpt-tbl-wrap">
								<h5 class="rpt-tbl-t">損益表 · 摘要（千元）</h5>
								<table class="rpt-pl">
								<thead>
									<tr>
										<th>科目</th>
										<th>當月</th>
										<th>前月</th>
										<th>YTD</th>
									</tr>
								</thead>
								<tbody>
									{#each reportPl as r}
										<tr>
											<td>{r.k}</td>
											<td class:neg={r.neg}>{r.m}</td>
											<td class:neg={r.neg}>{r.p}</td>
											<td class:neg={r.neg}>{r.y}</td>
										</tr>
									{/each}
									<tr class="tot">
										<td>淨利 Net Income</td>
										<td>380</td>
										<td>340</td>
										<td>1,850</td>
									</tr>
								</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ─── COMMUNICATION 溝通示範 ─── -->
	<section
		class="border-t border-[var(--line)]"
		style="padding-top: var(--sec-top); padding-bottom: var(--sec);"
	>
		<div class="wrap">
			<div class="text-center mb-[clamp(48px,5vw,72px)]">
				<h2 class="sec-title reveal" use:reveal>
					溝通示範<span class="sec-en">— Communication</span>
				</h2>
				<p class="sec-intro reveal" use:reveal>
					月報不是寄出去就結束——重點會先整理成一則訊息送到你手上，<br
					/>打開附件之前，你已經知道這個月要注意什麼。
				</p>
			</div>

			<div class="flex justify-center reveal" use:reveal>
				<div
					class="chat-demo"
					use:chatPlay
					aria-label="財務月報 LINE 對話示意動畫"
				>
					<div class="chat-header">
						<div class="chat-avatar" aria-hidden="true">奕</div>
						<div class="min-w-0">
							<div class="chat-name">奕成財創</div>
							<div class="chat-status">財務月報通知</div>
						</div>
					</div>

					<div class="chat-body" bind:this={chatBody}>
						{#if chatStep >= 1}
							<div
								class="date-pill"
								transition:fly={{ y: 14, duration: 420 }}
							>
								6 月財務月報
							</div>
						{/if}

						{#if chatStep >= 2}
							<div
								class="message-row"
								transition:fly={{ y: 16, duration: 450 }}
							>
								<div class="mini-avatar" aria-hidden="true">奕</div>
								<div class="bubble">
									老闆您好，本月已完成關帳，重點如下
								</div>
							</div>
						{/if}

						{#if chatStep >= 3}
							<div
								class="message-row"
								transition:fly={{ y: 16, duration: 450 }}
							>
								<div class="mini-avatar" aria-hidden="true">奕</div>
								<div class="bubble">
									6 月毛利率回升帶動淨利成長 12%，但應收逾 60
									天佔比升至 18%，本月需優先處理催收。
								</div>
							</div>
						{/if}

						{#if chatStep >= 4}
							<div
								class="message-row"
								transition:fly={{ y: 16, duration: 450 }}
							>
								<div class="mini-avatar" aria-hidden="true">奕</div>
								<div class="bubble">
									<strong>以下為本月財務重點：</strong>
									<div class="metric-list">
										<div class="metric">
											<b>營收：</b>520 萬，較上月略增
											2%，連兩月高於預算。
										</div>
										<div class="metric">
											<b>獲利：</b>淨利 38
											萬（+12%），毛利率回升至
											34%；營業費用增 10 萬需留意。
										</div>
										<div class="metric">
											<b>現金：</b>月底 310 萬，優於預期
											60 萬，約可支應 3 個月營運。
										</div>
									</div>
								</div>
							</div>
						{/if}

						{#if chatStep >= 5}
							<div
								class="message-row"
								transition:fly={{ y: 16, duration: 450 }}
							>
								<div class="mini-avatar" aria-hidden="true">奕</div>
								<div class="bubble">
									<strong>上期議題追蹤：</strong>
									<div class="metric-list">
										<div class="metric">
											<b>供應商重新議價：</b><span
												class="st-done">已完成</span
											>，本月毛利率回升 2pp 主要來自此案。
										</div>
										<div class="metric">
											<b>閒置設備處分：</b><span
												class="st-doing">進行中</span
											>，已取得兩家報價，預計 7 月底完成。
										</div>
									</div>
								</div>
							</div>
						{/if}

						{#if chatStep >= 6}
							<div
								class="message-row"
								transition:fly={{ y: 16, duration: 450 }}
							>
								<div class="mini-avatar" aria-hidden="true">奕</div>
								<div class="bubble">
									<strong>本月新議題，留待月會討論：</strong>
									<div class="metric-list">
										<div class="metric">
											<b>應收催收：</b>逾 60 天佔比升至
											18%，需定催收分工與停止供貨門檻。
										</div>
										<div class="metric">
											<b>客戶集中：</b>單一客戶佔營收
											42%，討論逐步分散的方案。
										</div>
									</div>
								</div>
							</div>
						{/if}

						{#if chatStep >= 7}
							<div
								class="message-row"
								transition:fly={{ y: 16, duration: 450 }}
							>
								<div class="mini-avatar" aria-hidden="true">奕</div>
								<div class="bubble">詳細內容請見附件報告。</div>
							</div>
						{/if}

						{#if chatStep >= 8}
							<div
								class="message-row"
								transition:fly={{ y: 16, duration: 450 }}
							>
								<div class="mini-avatar" aria-hidden="true">奕</div>
								<div class="bubble">
									<div
										class="attachment"
										role="img"
										aria-label="6月奕成財務月報 PDF 附件"
									>
										<div
											class="pdf-icon"
											aria-hidden="true"
										></div>
										<div>
											<div class="attachment-title">
												6月奕成財務月報.pdf
											</div>
											<div class="attachment-meta">
												PDF 報告附件
											</div>
										</div>
									</div>
								</div>
							</div>
						{/if}

						{#if chatStep >= 9}
							<div
								class="message-row owner"
								transition:fly={{ y: 16, duration: 450 }}
							>
								<div class="bubble">
									收到了，非常清楚，謝謝。
								</div>
							</div>
						{/if}

						{#if chatStep >= 10}
							<div
								class="message-row owner"
								transition:fly={{ y: 16, duration: 450 }}
							>
								{#if chatStep >= 11}
									<span
										class="owner-meta"
										transition:fade={{ duration: 400 }}
										>已讀<br />09:18</span
									>
								{/if}
								<div class="bubble">
									細節我們本週月會討論。
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ─── CASES 客戶案例 ─── -->
	<section
		id="cases"
		class="bg-[var(--paper)] border-t border-[var(--line)]"
		style="padding-top: var(--sec-top); padding-bottom: var(--sec);"
	>
		<div class="wrap">
			<div class="text-center mb-[clamp(60px,7vw,100px)]">
				<h2 class="sec-title reveal" use:reveal>
					客戶案例<span class="sec-en">— Cases</span>
				</h2>
				<p class="sec-intro reveal" use:reveal>
					他們原本也卡在下面兩層。<span
						style="color: var(--muted); font-size: 14px;"
						>客戶資訊均經匿名處理。</span
					>
				</p>
			</div>

			<div class="max-w-[1080px] mx-auto grid md:grid-cols-2 gap-6">
				{#each featuredCases as c, i}
					<div class="ccard reveal reveal-d{i}" use:reveal>
						<div class="ccard-head">
							<span class="ccard-ix">{c.ix}</span>
							<span class="ccard-name">{c.name}</span>
							<span class="ccard-tags">
								{#each c.tags as tg, ti}
									<span class="ccard-tag" class:hl={ti === 1}
										>{tg}</span
									>
								{/each}
							</span>
						</div>
						<div class="ccard-body">
							<p class="ccard-sit">
								<span class="ccard-lbl">現況</span>{c.sit}
							</p>
							<p class="ccard-how">
								<span class="ccard-lbl">決策層做了什麼</span
								>{c.how}
							</p>
							<div class="ccard-res">
								<span class="ccard-res-lbl">成果</span>
								<ul>
									{#each c.res as r}
										<li>{r}</li>
									{/each}
								</ul>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<div
				class="max-w-[1080px] mx-auto mt-[clamp(48px,5vw,72px)] reveal"
				use:reveal
			>
				<p class="label-muted mb-4">更多案例</p>
				<div class="grid sm:grid-cols-2 gap-4">
					{#each caseItems as c}
						<a href={`/cases/${c.slug}`} class="more-case">
							<span class="more-case-ind">{c.ind}</span>
							<span class="more-case-t">「{c.title}」</span>
							<ArrowRight class="w-3.5 h-3.5 shrink-0" />
						</a>
					{/each}
				</div>
				<p class="ind-served reveal" use:reveal>
					服務產業：金融科技・軟體新創・活動公關・國際貿易・物流・健康產業
				</p>
			</div>
		</div>
	</section>

	<!-- ─── MID CTA ─── -->
	<section class="border-t border-[var(--line)]">
		<div class="wrap">
			<div
				class="max-w-[800px] mx-auto text-center reveal"
				use:reveal
				style="padding: clamp(56px, 6vw, 88px) 0;"
			>
				<p class="mid-cta-line">
					看到這裡，如果有幾個畫面很像你的公司——直接聊聊你的狀況。
				</p>
				<div
					class="cta-btns mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
				>
					<a
						href="#contact"
						class="btn-primary"
						onclick={(e) => {
							track("cta_click", { location: "mid_cta" });
							scrollToAnchor(e, "#contact");
						}}
					>
						預約初步評估
						<ArrowRight class="w-3.5 h-3.5" />
					</a>
					<a
						href={LINE_ADD_URL}
						target="_blank"
						rel="noopener noreferrer"
						class="btn-line"
						onclick={() =>
							track("line_click", { location: "mid_cta" })}
					>
						<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 5.66 2 10.16c0 4.03 3.58 7.41 8.41 8.05.33.07.77.22.89.5.1.26.07.66.03.92l-.14.86c-.04.26-.2 1 .88.55 1.08-.46 5.8-3.42 7.92-5.85C21.46 13.5 22 11.9 22 10.16 22 5.66 17.52 2 12 2z"/></svg>
						加 LINE 好友諮詢
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- ─── WHY US 為什麼是奕成 ─── -->
	<section
		id="about"
		class="border-t border-[var(--line)]"
		style="padding-top: var(--sec-top); padding-bottom: var(--sec);"
	>
		<div class="wrap">
			<div class="text-center mb-[clamp(60px,7vw,100px)]">
				<h2 class="sec-title reveal" use:reveal>
					為什麼是奕成<span class="sec-en">— Why Us</span>
				</h2>
				<p class="sec-intro reveal" use:reveal>
					近 20
					年財務、會計與稅務實戰經驗，橫跨外商、中小企業到新創，經手過各種規模的財務治理。我創辦奕成財創，是想在合法合規的前提下，探索財務創新與技術應用的可能，打造對企業更友善的財務環境，協助企業做出更好的決策、提升營運績效，與企業共同成長。
				</p>
			</div>

			<div
				class="max-w-[980px] mx-auto grid md:grid-cols-2 gap-[clamp(40px,6vw,96px)]"
			>
				<div class="reveal" use:reveal>
					<h3 class="sub-title">
						我們的願景<small>Vision</small>
					</h3>
					<p class="body-copy mb-[18px]">
						財務不該是老闆心裡那塊「不想面對的後勤」。
						我們相信財務可以是<span class="quote-mark">槓桿</span
						>——把方針定清楚、把數字做可信，公司的每一個決定都更有力。
					</p>
					<p class="body-copy">
						奕成財創在合法合規的前提下，協助企業做出更好的決策、提升營運績效，與企業共同成長。
					</p>
				</div>
				<div class="reveal reveal-d1" use:reveal>
					<h3 class="sub-title">
						想解決的問題<small>The Problem</small>
					</h3>
					<p class="body-copy mb-[18px]">
						多數中小企業不缺記帳、不缺報稅，缺的是「數字能不能拿來做決定」。
						生意變了、方針沒跟上，每個人心中都有不同的答案——數字自然對不起來。
					</p>
					<p class="body-copy">
						我們要解決的就是這件事：讓老闆每個月<span
							class="quote-mark">看得懂自己的公司，然後能做決定</span
						>。
					</p>
				</div>
			</div>

		</div>
	</section>

	<!-- ─── NEXT STEPS 下一步 ─── -->
	<section
		id="price"
		class="border-t border-[var(--line)]"
		style="padding-top: var(--sec-top); padding-bottom: var(--sec);"
	>
		<div class="wrap">
			<div class="text-center mb-[clamp(60px,7vw,100px)]">
				<h2 class="sec-title reveal" use:reveal>
					下一步<span class="sec-en">— Next Steps</span>
				</h2>
				<p class="sec-intro reveal" use:reveal>
					合作分四步走，先從一次初步評估開始。
				</p>
			</div>

			<div
				class="max-w-[1160px] mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
			>
				{#each nextSteps as s, i}
					<div
						class="step-card reveal reveal-d{i}"
						class:hl={s.hl}
						use:reveal
					>
						<span class="step-card-n">{s.n}</span>
						<h3 class="step-card-t">{s.t}</h3>
						<p class="step-card-d">{s.d}</p>
						{#if s.hl}
							<span class="step-card-here">我們在這裡開始</span>
						{/if}
					</div>
				{/each}
			</div>

			<div
				class="max-w-[860px] mx-auto mt-[clamp(56px,6vw,88px)] reveal"
				use:reveal
			>
				<div class="hc-card">
					<div class="hc-head">
						<span class="label-muted">STEP 1 · 初步評估</span>
						<h3 class="hc-t">一次面談，看看我們適不適合</h3>
					</div>
					<ul class="hc-list">
						{#each evalItems as item}
							<li>{item}</li>
						{/each}
					</ul>
					<div class="hc-foot">
						<div>
							<span class="hc-price">免費</span>
							<span class="hc-note">約 30 分鐘，線上或面對面</span>
						</div>
						<a
							href="#contact"
							class="btn-primary"
							onclick={(e) => {
								track("cta_click", {
									location: "next_steps",
								});
								scrollToAnchor(e, "#contact");
							}}
						>
							預約初步評估
							<ArrowRight class="w-3.5 h-3.5" />
						</a>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ─── CTA ─── -->
	<section
		id="contact"
		class="bg-[var(--paper)] border-t border-[var(--line)]"
		style="padding-top: var(--sec-top); padding-bottom: clamp(64px,7vw,96px);"
	>
		<div class="wrap">
			<div class="mb-[clamp(40px,4vw,64px)] text-center">
				<h2 class="sec-title reveal" use:reveal>
					聯絡我們<span class="sec-en">— Contact</span>
				</h2>
			</div>

			<div class="max-w-[800px] mx-auto">
				<div class="text-center mb-12">
					<p class="body-copy">
						留下聯絡方式，我會先了解你的公司階段與目前狀況，判斷是否適合，再安排財務健檢。
					</p>
				</div>

				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
					class="space-y-6"
				>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
						<div
							class="flex items-baseline gap-2 border-b border-[var(--line)] pb-2"
						>
							<label
								for="field-name"
								class="whitespace-nowrap"
								style="font-family: var(--font-serif); font-size: var(--text-nav); color: var(--ink);"
								>姓名</label
							>
							<input
								id="field-name"
								type="text"
								bind:value={formData.name}
								required
								class="flex-1 min-w-0 bg-transparent text-[var(--ink)] focus:outline-none focus-visible:outline-1 focus-visible:outline-[var(--brand-primary)]"
							/>
						</div>

						<div
							class="flex items-baseline gap-2 border-b border-[var(--line)] pb-2"
						>
							<label
								for="field-phone"
								class="whitespace-nowrap"
								style="font-family: var(--font-serif); font-size: var(--text-nav); color: var(--ink);"
								>電話</label
							>
							<input
								id="field-phone"
								type="tel"
								bind:value={formData.phone}
								required
								class="flex-1 min-w-0 bg-transparent text-[var(--ink)] focus:outline-none focus-visible:outline-1 focus-visible:outline-[var(--brand-primary)]"
							/>
						</div>

						<div
							class="flex items-baseline gap-2 border-b border-[var(--line)] pb-2"
						>
							<label
								for="field-email"
								class="whitespace-nowrap"
								style="font-family: var(--font-serif); font-size: var(--text-nav); color: var(--ink);"
								>Email</label
							>
							<input
								id="field-email"
								type="email"
								bind:value={formData.email}
								required
								class="flex-1 min-w-0 bg-transparent text-[var(--ink)] focus:outline-none focus-visible:outline-1 focus-visible:outline-[var(--brand-primary)]"
							/>
						</div>

						<div class="relative dropdown-container">
							<div
								role="button"
								tabindex="0"
								aria-haspopup="listbox"
								aria-expanded={activeDropdown === "revenue"}
								aria-controls="revenue-listbox"
								aria-label="營收規模：{formData.revenue ||
									'請選擇'}"
								onclick={() => toggleDropdown("revenue")}
								onkeydown={(e) =>
									(e.key === "Enter" || e.key === " ") &&
									(e.preventDefault(),
									toggleDropdown("revenue"))}
								class="flex items-baseline gap-2 border-b border-[var(--line)] pb-2 cursor-pointer select-none"
							>
								<span
									class="whitespace-nowrap"
									style="font-family: var(--font-serif); font-size: 0.95rem; color: var(--ink);"
									>營收規模</span
								>
								<span
									class="flex-1"
									style="font-family: var(--font-serif); font-size: 0.95rem; color: {formData.revenue
										? 'var(--ink)'
										: 'var(--muted)'};"
									>{formData.revenue || "請選擇"}</span
								>
								<svg
									class="w-3 h-3"
									style="color: var(--line-2);"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1"
								>
									<polyline points="6 9 12 15 18 9"
									></polyline>
								</svg>
							</div>
							{#if activeDropdown === "revenue"}
								<div
									id="revenue-listbox"
									role="listbox"
									aria-label="營收規模"
									class="absolute top-full left-0 right-0 mt-1 z-20 border border-[var(--line)]"
									style="background-color: var(--bg);"
								>
									{#each revenueOptions as option}
										<div
											role="option"
											tabindex="0"
											aria-selected={formData.revenue ===
												option}
											onclick={() =>
												selectOption(option, "revenue")}
											onkeydown={(e) =>
												(e.key === "Enter" ||
													e.key === " ") &&
												(e.preventDefault(),
												selectOption(
													option,
													"revenue",
												))}
											class="px-4 py-2 cursor-pointer hover:bg-[var(--paper)] transition-colors"
											style="font-family: var(--font-serif); font-size: 0.95rem; color: var(--ink);"
										>
											{option}
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<div class="cta-btns flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 pt-8">
						<button
							type="submit"
							disabled={isSubmitting}
							class="btn-primary"
						>
							{isSubmitting ? "提交中..." : "送出預約"}
							{#if !isSubmitting}
								<ArrowRight class="w-3.5 h-3.5" />
							{/if}
						</button>
						<a
							href={LINE_ADD_URL}
							target="_blank"
							rel="noopener noreferrer"
							class="btn-line"
							onclick={() =>
								track("line_click", { location: "contact" })}
						>
							<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 5.66 2 10.16c0 4.03 3.58 7.41 8.41 8.05.33.07.77.22.89.5.1.26.07.66.03.92l-.14.86c-.04.26-.2 1 .88.55 1.08-.46 5.8-3.42 7.92-5.85C21.46 13.5 22 11.9 22 10.16 22 5.66 17.52 2 12 2z"/></svg>
							加 LINE 好友諮詢
						</a>
						<div class="hidden md:flex items-center gap-3">
							<img
								src="/line-qrcode.png"
								alt="奕成財創官方 LINE QR Code"
								width="72"
								height="72"
								class="border border-[var(--line)] p-1 shrink-0"
							/>
							<span class="meta" style="line-height: 1.7; font-style: normal; letter-spacing: 0.1em;">官方 LINE<br />掃碼加入</span>
						</div>
					</div>

					<p class="consent-note">
						送出即表示同意本網站依<a href="/privacy"
							>隱私權政策</a
						>，僅於服務聯繫目的內使用您的資料。
					</p>

					{#if submitMessage}
						{#if submitOk}
							<div
								class="submit-ok"
								transition:slide={{ duration: 300 }}
							>
								<p>{submitMessage}</p>
								<a
									href={LINE_ADD_URL}
									target="_blank"
									rel="noopener noreferrer"
									class="btn-line sm"
									onclick={() =>
										track("line_click", {
											location: "submit_success",
										})}
								>
									也可以先加 LINE，直接聊
								</a>
							</div>
						{:else}
							<p class="text-center text-sm mt-6 text-red-600">
								{submitMessage}
							</p>
						{/if}
					{/if}
				</form>
			</div>
		</div>
	</section>

	<!-- ─── FAQ ─── -->
	<section
		id="faq"
		class="border-t border-[var(--line)]"
		style="padding-top: var(--sec-top); padding-bottom: var(--sec);"
	>
		<div class="wrap">
			<div class="max-w-[920px] mx-auto">
				<h2
					class="sec-title reveal mb-[clamp(48px,6vw,80px)]"
					use:reveal
				>
					常見問題<span class="sec-en">— FAQ</span>
				</h2>
			</div>

			<div class="max-w-[920px] mx-auto divide-y divide-[var(--line)]">
				{#each faqItems as faq, i}
					<div class="py-8 reveal faq-item-wrap" use:reveal>
						<button
							class="w-full text-left flex justify-between items-center group cursor-pointer"
							onclick={(e) => toggleFaq(i, e)}
						>
							<h3
								class="faq-q group-hover:text-[var(--brand-primary)] transition-colors duration-300 m-0"
							>
								{faq.q}
							</h3>
							<div class="faq-icon" class:open={activeFaq === i}>
								<div class="faq-icon-line-h"></div>
								<div class="faq-icon-line-v"></div>
							</div>
						</button>
						{#if activeFaq === i}
							<div
								transition:slide={{
									duration: 400,
									easing: easeOutCubic,
								}}
							>
								<p class="body-copy max-w-[640px] pt-6">
									{faq.a}
								</p>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- ─── FOOTER ─── -->
	<footer
		class="bg-[var(--bg-deep)] border-t border-[var(--line)]"
		style="padding: clamp(28px,4vw,44px) 0 24px;"
	>
		<div class="wrap">
			<div
				class="max-w-[980px] mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6"
			>
				<div>
					<div class="flex items-center gap-4">
						<a
							href="/"
							class="inline-block shrink-0"
							aria-label="奕成財創"
						>
							<img
								src="/yclogo.svg"
								alt="奕成財創 Logo"
								class="h-6 w-auto opacity-90 hover:opacity-100 transition-opacity"
							/>
						</a>
						<p class="body-copy m-0 max-w-[440px]">
							把財務，變成你的槓桿。<br />Finance isn't overhead.
							It's leverage.
						</p>
					</div>
					<div class="meta mt-4" style="line-height: 1.8;">
						<a
							href="mailto:contact@yicheng.finance"
							class="hover:text-[var(--ink)] transition-colors duration-200"
							>contact@yicheng.finance</a
						>
					</div>

				</div>
				<div class="foot-meta md:text-right" style="line-height: 1.8;">
					<div>&copy; 2026 奕成財創有限公司</div>
					<div>Fractional CFO · 財務治理與決策支持</div>
					<div>
						<a
							href="/articles"
							class="hover:text-[var(--ink)] transition-colors duration-200"
							>文章</a
						>
					</div>
					<div>
						<a
							href="/privacy"
							class="hover:text-[var(--ink)] transition-colors duration-200"
							>隱私權政策</a
						>
					</div>
				</div>
			</div>
		</div>
	</footer>
</div>

	<style>
		/* ── Hero ── */
		.hero-bg {
			background-image:
				linear-gradient(
					90deg,
					rgba(252, 252, 252, 0.98) 0%,
					rgba(252, 252, 252, 0.9) 32%,
					rgba(252, 252, 252, 0.46) 58%,
					rgba(252, 252, 252, 0.12) 100%
				),
				linear-gradient(
					180deg,
					rgba(252, 252, 252, 0.1) 0%,
					rgba(252, 252, 252, 0.82) 100%
				),
				url("/hero-background.png");
			background-size: cover;
			background-position: center center;
			background-repeat: no-repeat;
		}
		@media (max-width: 767px) {
			.hero-bg {
				background-image:
					linear-gradient(
						180deg,
						rgba(252, 252, 252, 0.88) 0%,
						rgba(252, 252, 252, 0.72) 38%,
						rgba(252, 252, 252, 0.96) 100%
					),
					url("/hero-background.png");
				background-position: 62% center;
			}
		}
		.hero-headline {
			font-family: var(--font-serif);
			font-weight: 500;
		font-size: clamp(30px, 4vw, 44px);
		line-height: 1.4;
		letter-spacing: 0.06em;
		color: var(--ink);
	}
	.hero-u {
		border-bottom: 2px solid var(--brand-accent);
		padding-bottom: 2px;
	}
	.hero-latin {
		font-family: var(--font-latin);
		font-style: italic;
		font-size: clamp(15px, 1.6vw, 18px);
		letter-spacing: 0.12em;
		color: var(--brand-primary);
		margin-top: 12px;
	}
	.hero-lede {
		font-family: var(--font-serif);
		font-size: var(--text-body);
		line-height: 2;
		color: var(--ink-2);
		opacity: 0.85;
		margin-top: 14px;
	}
	/* ── Situations ── */
	.sit-col {
		border-top: 1px solid var(--line-2);
		padding-top: 16px;
	}
	.sit-num {
		display: block;
		font-family: var(--font-latin);
		font-style: italic;
		font-size: clamp(22px, 2.2vw, 28px);
		color: var(--brand-primary);
		opacity: 0.4;
		line-height: 1;
		margin-bottom: 14px;
	}
	.sit-title {
		font-family: var(--font-serif);
		font-size: clamp(17px, 1.6vw, 19px);
		font-weight: 500;
		letter-spacing: 0.03em;
		line-height: 1.6;
		color: var(--ink);
		margin: 0 0 8px;
	}
	.sit-desc {
		font-family: var(--font-serif);
		font-size: 14px;
		line-height: 1.9;
		color: var(--muted);
		margin: 0;
	}

	/* ── Diagnosis ── */
	.diag-progress {
		font-family: var(--font-latin);
		font-style: italic;
		font-size: 14px;
		letter-spacing: 0.08em;
		color: var(--muted);
		text-align: right;
		margin: 0 0 10px;
	}
	.diag-row {
		display: grid;
		grid-template-columns: 1fr 460px;
		gap: 16px;
		align-items: center;
		padding: 18px 0;
		border-bottom: 1px solid var(--line);
	}
	.diag-row:first-of-type {
		border-top: 1.5px solid var(--line-2);
	}
	.diag-q {
		display: flex;
		gap: 14px;
		align-items: baseline;
	}
	.diag-num {
		font-family: var(--font-latin);
		font-style: italic;
		font-size: var(--text-body);
		color: var(--brand-primary);
		min-width: 20px;
	}
	.diag-text {
		font-family: var(--font-serif);
		font-size: 16px;
		line-height: 1.8;
		color: var(--ink);
	}
	.diag-opts {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}
	.diag-opt {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border: 1px solid var(--line);
		background: #fff;
		cursor: pointer;
		text-align: left;
		transition:
			border-color 0.2s,
			background 0.2s;
	}
	.diag-opt:hover {
		border-color: var(--brand-primary);
	}
	.diag-opt i {
		width: 12px;
		height: 12px;
		border: 1.5px solid var(--line-2);
		border-radius: 50%;
		flex: none;
		transition:
			background 0.2s,
			border-color 0.2s;
	}
	.diag-opt span {
		font-family: var(--font-serif);
		font-size: 12.5px;
		line-height: 1.5;
		color: var(--ink-2);
	}
	.diag-opt.sel {
		border-color: var(--brand-primary);
		background: #eef3f7;
	}
	.diag-opt.sel i {
		background: var(--brand-primary);
		border-color: var(--brand-primary);
	}
	.diag-opt.sel.warn {
		border-color: var(--brand-accent);
		background: #f7f0e3;
	}
	.diag-opt.sel.warn i {
		background: var(--brand-accent);
		border-color: var(--brand-accent);
	}
	.diag-verdict {
		margin-top: 36px;
		padding: clamp(28px, 3.2vw, 40px);
		background: #fff;
		border: 1px solid var(--line-2);
		border-top: 2px solid var(--brand-primary);
		text-align: center;
	}
	.diag-verdict h3 {
		font-family: var(--font-serif);
		font-size: clamp(19px, 2vw, 24px);
		font-weight: 500;
		letter-spacing: 0.05em;
		color: var(--ink);
		margin: 0 0 14px;
	}
	.diag-verdict p {
		font-family: var(--font-serif);
		font-size: var(--text-body);
		line-height: 2.1;
		color: var(--ink-2);
		max-width: 620px;
		margin: 0 auto 24px;
	}
	@media (max-width: 900px) {
		.diag-row {
			grid-template-columns: 1fr;
			gap: 10px;
		}
	}
	@media (max-width: 560px) {
		.diag-opts {
			grid-template-columns: 1fr;
			gap: 6px;
		}
	}

	/* ── Services ── */
	.svc-fig svg {
		width: 100%;
		max-width: 340px;
		margin: 0 auto;
		display: block;
	}
	.svc-row {
		padding: 18px 0 18px 22px;
		border-left: 3px solid var(--line-2);
		border-bottom: 1px solid var(--line);
	}
	.svc-row:last-child {
		border-bottom: none;
	}
	.svc-row.on {
		border-left-color: #1f9ec4;
		background: linear-gradient(90deg, #f2f9fb, transparent 70%);
	}
	.svc-row-head {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 4px;
	}
	.svc-lv {
		font-family: var(--font-serif);
		font-size: clamp(18px, 1.9vw, 22px);
		font-weight: 500;
		letter-spacing: 0.1em;
		color: var(--ink);
	}
	.svc-tag {
		font-size: 11px;
		letter-spacing: 0.1em;
		padding: 3px 10px;
		background: var(--bg-deep);
		color: var(--muted);
	}
	.svc-tag.on {
		background: #1f9ec4;
		color: #fff;
	}
	.svc-sub {
		font-family: var(--font-latin);
		font-style: italic;
		font-size: 13px;
		letter-spacing: 0.16em;
		color: var(--muted);
		margin: 0 0 8px;
		font-weight: 400;
	}
	.svc-items {
		font-family: var(--font-serif);
		font-size: 14.5px;
		line-height: 2;
		color: var(--ink-2);
		margin: 0;
	}
	.svc-who {
		font-size: 12.5px;
		line-height: 1.8;
		color: var(--muted);
		margin: 6px 0 0;
	}
	.svc-who::before {
		content: "▸ ";
		color: var(--line-2);
	}
	/* ── Services 收尾：深藍細框卡 ── */
	.svc-note {
		border: 1px solid var(--brand-primary);
		border-left-width: 3px;
		background: #fff;
		padding: clamp(22px, 2.6vw, 32px) clamp(24px, 3vw, 40px);
		font-family: var(--font-serif);
		font-size: clamp(15.5px, 1.6vw, 17.5px);
		line-height: 2.1;
		color: var(--ink-2);
	}
	.svc-note b {
		color: var(--brand-primary);
		font-weight: 600;
	}

	/* ── Report why ── */
	.report-why {
		border-top: 1px solid var(--line);
		border-bottom: 1px solid var(--line);
	}
	.report-why-cell {
		padding: 18px 26px;
		border-left: 1px solid var(--line);
	}
	.report-why-cell:first-child {
		border-left: none;
		padding-left: 0;
	}
	.report-why-cell b {
		display: block;
		font-family: var(--font-serif);
		font-size: 16.5px;
		font-weight: 500;
		color: var(--ink);
	}
	.report-why-cell span {
		display: block;
		margin-top: 4px;
		font-size: 13px;
		line-height: 1.8;
		color: var(--muted);
	}
	@media (max-width: 768px) {
		.report-why-cell {
			border-left: none;
			border-top: 1px solid var(--line);
			padding-left: 0;
		}
		.report-why-cell:first-child {
			border-top: none;
		}
	}

	/* ── Report mock（顧問圖表：深藍＋青）── */
	.rpt {
		--rnavy: #051c2c;
		--rteal: #1f9ec4;
		--rgreen: #1a7f5a;
		--rred: #b3261e;
		--ramber: #b07d2b;
		--rg1: #f4f3f0;
		--rg2: #e4e1db;
		--rg5: #76746e;
		background: #fff;
		border: 1px solid var(--rg2);
		box-shadow: 0 12px 34px rgba(5, 28, 44, 0.1);
		font-family: var(--font-sans);
	}
	.rpt-top {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
		background: var(--rnavy);
		border-top: 3px solid var(--rteal);
		color: #fff;
		padding: 11px 20px;
	}
	.rpt-brand {
		font-family: var(--font-serif);
		font-weight: 500;
		font-size: 15px;
	}
	.rpt-badge {
		font-size: 10px;
		letter-spacing: 0.08em;
		background: rgba(255, 255, 255, 0.16);
		padding: 3px 9px;
	}
	.rpt-period {
		margin-left: auto;
		font-size: 12px;
		color: #b9c6ce;
	}
	.rpt-body {
		padding: clamp(16px, 2vw, 24px);
		display: flex;
		flex-direction: column;
		gap: clamp(14px, 1.8vw, 20px);
	}
	.rpt-exec {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}
	@media (max-width: 768px) {
		.rpt-exec {
			grid-template-columns: 1fr;
		}
	}
	.rpt-box {
		border: 1px solid var(--rg2);
		padding: 16px 18px;
	}
	.rpt-box.analysis {
		border-top: 2px solid var(--rnavy);
	}
	.rpt-box.watch {
		border-top: 2px solid var(--rteal);
	}
	.rpt-box h5 {
		font-family: var(--font-serif);
		font-size: 13px;
		font-weight: 600;
		color: var(--rnavy);
		margin: 0 0 10px;
	}
	.rpt-box ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 9px;
	}
	.rpt-box.analysis li {
		position: relative;
		padding-left: 13px;
		font-size: 12.5px;
		line-height: 1.6;
		color: #2c2a27;
	}
	.rpt-box.analysis li::before {
		content: "";
		position: absolute;
		left: 0;
		top: 8px;
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--rnavy);
	}
	.rpt-box.watch li {
		display: flex;
		gap: 8px;
		align-items: flex-start;
		font-size: 12.5px;
		line-height: 1.6;
		color: #2c2a27;
	}
	.rpt-box b {
		font-weight: 700;
		color: var(--rnavy);
	}
	.rpt-box b.g {
		color: var(--rgreen);
	}
	.wb {
		flex: none;
		font-size: 9px;
		font-weight: 700;
		color: #fff;
		padding: 2px 7px;
		margin-top: 2px;
	}
	.wb.p1 {
		background: var(--rred);
	}
	.wb.p2 {
		background: var(--ramber);
	}
	.rpt-kpi {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 14px;
	}
	@media (max-width: 640px) {
		.rpt-kpi {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	.rpt-k {
		border-top: 2px solid var(--rgreen);
		padding-top: 10px;
		display: flex;
		flex-direction: column;
	}
	.rpt-k .kl {
		font-size: 10.5px;
		letter-spacing: 0.06em;
		color: var(--rg5);
	}
	.rpt-k .kv {
		font-family: var(--font-serif);
		font-variant-numeric: tabular-nums lining-nums;
		font-size: clamp(20px, 2.2vw, 26px);
		font-weight: 600;
		color: var(--rnavy);
		margin-top: 2px;
	}
	.rpt-k .kd {
		font-size: 10.5px;
		margin-top: 2px;
		color: var(--rg5);
	}
	.rpt-k .kd.up {
		color: var(--rgreen);
	}
	/* ── Report chart carousel ── */
	.rpt-bot {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: clamp(18px, 2.4vw, 32px);
		align-items: start;
	}
	.rpt-bot > * {
		min-width: 0;
	}
	@media (max-width: 860px) {
		.rpt-bot {
			grid-template-columns: 1fr;
		}
	}
	.rpt-chart svg {
		width: 100%;
		height: auto;
		display: block;
	}
	.rpt-cclab {
		font-size: 11.5px;
		color: var(--rg5);
		margin: 0 0 6px;
	}
	.rpt-ccfoot {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 14px;
		margin-top: 8px;
	}
	.rpt-ccfoot > button {
		width: 22px;
		height: 22px;
		border: 1px solid var(--rg2);
		background: #fff;
		color: var(--rnavy);
		font-size: 13px;
		line-height: 1;
		cursor: pointer;
		display: grid;
		place-items: center;
		transition:
			border-color 0.2s,
			color 0.2s;
	}
	.rpt-ccfoot > button:hover {
		border-color: var(--rteal);
		color: var(--rteal);
	}
	.rpt-ccdots {
		display: flex;
		gap: 6px;
	}
	.rpt-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		border: none;
		padding: 0;
		background: var(--rg2);
		cursor: pointer;
		transition:
			background 0.25s,
			width 0.25s;
	}
	.rpt-dot.on {
		background: var(--rteal);
		width: 16px;
		border-radius: 3px;
	}

	.rpt-tbl-t {
		font-family: var(--font-serif);
		font-size: 13px;
		font-weight: 600;
		color: var(--rnavy);
		margin: 0 0 8px;
	}
	.rpt-tbl-wrap {
		overflow-x: auto;
	}
	.rpt-pl {
		width: 100%;
		border-collapse: collapse;
		font-variant-numeric: tabular-nums lining-nums;
		min-width: 420px;
	}
	.rpt-pl th {
		font-size: 10px;
		letter-spacing: 0.04em;
		color: var(--rg5);
		text-align: right;
		border-bottom: 1.5px solid var(--rnavy);
		padding: 4px 8px;
		font-weight: 700;
	}
	.rpt-pl th:first-child {
		text-align: left;
	}
	.rpt-pl td {
		font-size: 12.5px;
		color: #2c2a27;
		text-align: right;
		padding: 6px 8px;
		border-bottom: 1px solid var(--rg1);
	}
	.rpt-pl td:first-child {
		text-align: left;
		font-weight: 600;
		color: var(--rnavy);
	}
	.rpt-pl td.neg {
		color: var(--rred);
	}
	.rpt-pl tr.tot td {
		font-weight: 700;
		color: var(--rnavy);
		border-top: 1.5px solid var(--rnavy);
		border-bottom: none;
		padding-top: 7px;
	}

	/* ── Chat demo（LINE 對話示意動畫）── */
	.chat-demo {
		--chat-bg: #f7fbf8;
		--chat-header: #2fb86f;
		--chat-muted: #6d8176;
		--chat-line: #dce9e1;
		--chat-ink: #203128;
		width: min(430px, calc(100vw - 28px));
		background: var(--chat-bg);
		border: 1px solid rgba(43, 91, 64, 0.1);
		border-radius: 28px;
		box-shadow: 0 24px 70px rgba(34, 78, 55, 0.18);
		overflow: hidden;
		font-family: var(--font-sans);
	}
	.chat-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 18px 18px 15px;
		background: var(--chat-header);
		color: #fff;
	}
	.chat-avatar {
		width: 38px;
		height: 38px;
		display: grid;
		place-items: center;
		flex: 0 0 auto;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.92);
		color: #228d55;
		font-size: 15px;
		font-weight: 800;
	}
	.chat-name {
		font-size: 17px;
		line-height: 1.25;
		font-weight: 800;
	}
	.chat-status {
		margin-top: 2px;
		font-size: 12px;
		line-height: 1.3;
		opacity: 0.88;
	}
	.chat-body {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 10px;
		height: 520px;
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: none;
		padding: 18px 16px 20px;
		background:
			linear-gradient(
				rgba(247, 251, 248, 0.86),
				rgba(247, 251, 248, 0.86)
			),
			repeating-linear-gradient(
				135deg,
				transparent 0 16px,
				rgba(33, 185, 103, 0.04) 16px 17px
			);
	}
	.chat-body::-webkit-scrollbar {
		display: none;
	}
	.date-pill {
		align-self: center;
		flex: 0 0 auto;
		padding: 5px 11px;
		border-radius: 999px;
		background: rgba(30, 57, 42, 0.08);
		color: var(--chat-muted);
		font-size: 12px;
		font-weight: 650;
	}
	.message-row {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		justify-content: flex-start;
		flex: 0 0 auto;
	}
	.message-row.owner {
		justify-content: flex-end;
	}
	.message-row.owner .bubble {
		border-radius: 20px 4px 20px 20px;
		background: #d3f2de;
	}
	.mini-avatar {
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		flex: 0 0 auto;
		margin-bottom: 2px;
		border-radius: 50%;
		background: #e8f7ee;
		color: #278856;
		font-size: 11px;
		font-weight: 800;
		border: 1px solid rgba(39, 136, 86, 0.12);
	}
	.bubble {
		max-width: 332px;
		padding: 11px 13px 10px;
		border-radius: 4px 20px 20px 20px;
		background: #fff;
		box-shadow: 0 8px 24px rgba(33, 76, 51, 0.08);
		color: var(--chat-ink);
		font-size: 14px;
		line-height: 1.62;
	}
	.bubble strong {
		display: block;
		margin-bottom: 2px;
		font-size: 14px;
		line-height: 1.5;
	}
	.metric-list {
		display: grid;
		gap: 8px;
		margin-top: 8px;
	}
	.metric {
		padding-left: 10px;
		border-left: 3px solid rgba(33, 185, 103, 0.34);
	}
	.metric b {
		color: #177848;
		font-weight: 800;
	}
	.st-done {
		color: #177848;
		font-weight: 800;
	}
	.st-doing {
		color: #b07d2b;
		font-weight: 800;
	}
	.attachment {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 246px;
		padding: 10px 11px;
		border: 1px solid var(--chat-line);
		border-radius: 14px;
		background: linear-gradient(180deg, #ffffff 0%, #f7faf8 100%);
	}
	.pdf-icon {
		position: relative;
		width: 38px;
		height: 44px;
		flex: 0 0 auto;
		border-radius: 7px;
		background: #ffffff;
		border: 1px solid #f0b6ad;
		box-shadow: inset 0 -10px 0 #fff3f1;
	}
	.pdf-icon::before {
		content: "";
		position: absolute;
		right: -1px;
		top: -1px;
		border-top: 13px solid #fbe1dc;
		border-left: 13px solid transparent;
		border-radius: 0 7px 0 3px;
	}
	.pdf-icon::after {
		content: "PDF";
		position: absolute;
		left: 7px;
		bottom: 7px;
		color: #d85140;
		font-size: 9px;
		font-weight: 900;
	}
	.attachment-title {
		color: #27362e;
		font-size: 13px;
		line-height: 1.35;
		font-weight: 750;
	}
	.attachment-meta {
		margin-top: 2px;
		color: var(--chat-muted);
		font-size: 11px;
		line-height: 1.3;
	}
	.owner-meta {
		align-self: flex-end;
		flex: 0 0 auto;
		margin-bottom: 3px;
		color: var(--chat-muted);
		font-size: 10px;
		line-height: 1.5;
		text-align: right;
	}
	@media (max-width: 420px) {
		.chat-body {
			height: 480px;
			padding-inline: 13px;
		}
		.bubble {
			max-width: calc(100vw - 92px);
			font-size: 13px;
		}
	}

	/* ── LINE button / consent / submit-ok / mid CTA ── */
	.btn-line {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 16px 30px;
		background: #06c755;
		color: #fff;
		font-family: var(--font-serif);
		font-size: var(--text-nav);
		font-weight: 500;
		letter-spacing: 0.1em;
		text-decoration: none;
		border: 1px solid #06c755;
		transition:
			background 0.25s ease,
			border-color 0.25s ease,
			transform 0.3s ease;
	}
	.btn-line:hover {
		background: #05b34c;
		border-color: #05b34c;
		transform: translateY(-2px);
	}
	.btn-line svg {
		width: 18px;
		height: 18px;
	}
	.btn-line.sm {
		padding: 10px 20px;
		font-size: 14px;
	}
	/* CTA 成對按鈕：兩顆同尺寸 */
	.cta-btns :global(.btn-primary),
	.cta-btns .btn-line {
		min-width: 260px;
		justify-content: center;
	}
	@media (max-width: 639px) {
		.cta-btns :global(.btn-primary),
		.cta-btns .btn-line {
			width: 100%;
		}
	}
	.consent-note {
		text-align: center;
		font-size: 12.5px;
		color: var(--muted);
		margin-top: 20px;
		line-height: 1.8;
	}
	.consent-note a {
		color: var(--ink-2);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.consent-note a:hover {
		color: var(--brand-primary);
	}
	.submit-ok {
		margin-top: 24px;
		text-align: center;
		border: 1px solid var(--brand-primary);
		border-left-width: 3px;
		background: #f4f8fb;
		padding: 22px 24px;
	}
	.submit-ok p {
		font-family: var(--font-serif);
		font-size: 15.5px;
		color: var(--ink);
		margin: 0 0 14px;
	}
	.mid-cta-line {
		font-family: var(--font-serif);
		font-size: clamp(18px, 2vw, 24px);
		line-height: 1.9;
		letter-spacing: 0.04em;
		color: var(--ink);
		margin: 0;
		text-wrap: balance;
	}
	.ind-served {
		margin-top: clamp(28px, 3vw, 40px);
		text-align: center;
		font-family: var(--font-serif);
		font-size: 13.5px;
		letter-spacing: 0.08em;
		color: var(--muted);
	}

	/* ── Featured cases ── */
	.ccard {
		background: #fff;
		border: 1px solid var(--line);
		display: flex;
		flex-direction: column;
	}
	.ccard-head {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px 22px;
		background: var(--bg-deep);
		border-bottom: 1px solid var(--line);
		flex-wrap: wrap;
	}
	.ccard-ix {
		font-family: var(--font-latin);
		font-style: italic;
		font-size: 20px;
		color: var(--line-2);
	}
	.ccard-name {
		font-family: var(--font-serif);
		font-size: 19px;
		font-weight: 500;
		letter-spacing: 0.04em;
		color: var(--ink);
	}
	.ccard-tags {
		margin-left: auto;
		display: flex;
		gap: 7px;
	}
	.ccard-tag {
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--muted);
		background: #fff;
		border: 1px solid var(--line);
		padding: 3px 10px;
	}
	.ccard-tag.hl {
		color: var(--brand-primary);
		border-color: var(--brand-primary);
	}
	.ccard-body {
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding: clamp(22px, 2.6vw, 30px);
		flex: 1;
	}
	.ccard-lbl {
		display: block;
		font-size: 11px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--muted);
		margin-bottom: 5px;
	}
	.ccard-sit,
	.ccard-how {
		font-family: var(--font-serif);
		font-size: 14.5px;
		line-height: 2;
		color: var(--ink-2);
		margin: 0;
	}
	.ccard-res {
		margin-top: auto;
		background: var(--paper);
		border-left: 3px solid var(--brand-primary);
		padding: 18px 22px;
	}
	.ccard-res-lbl {
		display: block;
		font-size: 11px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--brand-primary);
		margin-bottom: 10px;
	}
	.ccard-res ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.ccard-res li {
		position: relative;
		padding-left: 24px;
		font-family: var(--font-serif);
		font-size: 15.5px;
		font-weight: 500;
		line-height: 1.8;
		color: var(--ink);
	}
	.ccard-res li::before {
		content: "✓";
		position: absolute;
		left: 0;
		top: 0;
		color: var(--brand-primary);
		font-weight: 700;
	}

	.more-case {
		display: flex;
		align-items: baseline;
		gap: 10px;
		padding: 16px 20px;
		background: #fff;
		border: 1px solid var(--line);
		text-decoration: none;
		color: var(--ink-2);
		transition:
			color 0.2s,
			border-color 0.2s,
			box-shadow 0.2s;
	}
	.more-case:hover {
		color: var(--brand-primary);
		border-color: var(--brand-primary);
		box-shadow: 0 2px 12px rgba(22, 74, 115, 0.08);
	}
	.more-case-ind {
		font-size: 11.5px;
		letter-spacing: 0.14em;
		color: var(--muted);
		white-space: nowrap;
	}
	.more-case-t {
		font-family: var(--font-serif);
		font-size: 14.5px;
		line-height: 1.7;
		flex: 1;
	}

	/* ── Next steps ── */
	.step-card {
		border: 1px solid var(--line);
		border-top: 3px solid var(--line-2);
		padding: clamp(24px, 2.8vw, 34px);
		background: #fff;
		display: flex;
		flex-direction: column;
	}
	.step-card.hl {
		border-color: var(--brand-primary);
		border-top-color: var(--brand-primary);
		background: #f4f8fb;
	}
	.step-card-n {
		font-family: var(--font-latin);
		font-style: italic;
		font-size: 13px;
		letter-spacing: 0.2em;
		color: var(--muted);
	}
	.step-card.hl .step-card-n {
		color: var(--brand-primary);
	}
	.step-card-t {
		font-family: var(--font-serif);
		font-size: clamp(19px, 2vw, 22px);
		font-weight: 500;
		letter-spacing: 0.05em;
		color: var(--ink);
		margin: 10px 0 10px;
	}
	.step-card-d {
		font-family: var(--font-serif);
		font-size: 14px;
		line-height: 2;
		color: var(--muted);
		margin: 0;
	}
	.step-card-here {
		margin-top: 16px;
		font-size: 11.5px;
		letter-spacing: 0.16em;
		color: var(--brand-primary);
	}

	.hc-card {
		border: 1px solid var(--line-2);
		border-top: 3px solid var(--brand-primary);
		background: #fff;
		padding: clamp(28px, 3.4vw, 44px);
	}
	.hc-t {
		font-family: var(--font-serif);
		font-size: clamp(21px, 2.3vw, 27px);
		font-weight: 500;
		letter-spacing: 0.05em;
		color: var(--ink);
		margin: 10px 0 0;
	}
	.hc-list {
		list-style: none;
		margin: 24px 0 0;
		padding: 0;
	}
	.hc-list li {
		position: relative;
		padding: 12px 0 12px 26px;
		border-bottom: 1px solid var(--line);
		font-family: var(--font-serif);
		font-size: 15.5px;
		line-height: 1.9;
		color: var(--ink-2);
	}
	.hc-list li::before {
		content: "✓";
		position: absolute;
		left: 0;
		top: 12px;
		color: var(--brand-primary);
		font-weight: 700;
	}
	.hc-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		flex-wrap: wrap;
		margin-top: 28px;
	}
	.hc-price {
		font-family: var(--font-serif);
		font-size: clamp(24px, 2.6vw, 32px);
		font-weight: 500;
		color: var(--ink);
	}
	.hc-note {
		font-family: var(--font-serif);
		font-size: 13.5px;
		color: var(--muted);
		margin-left: 12px;
	}
</style>
