
const VERIFIED_PLACES = [
  {
    names: ["việt nam", "nước việt nam"],
    area: "331.338 km²",
    area_note:
      "Số liệu diện tích được biên soạn sẵn. Giá trị có thể khác tùy nguồn và cách thống kê; giáo viên cần đối chiếu nguồn chính thức trước khi sử dụng.",
    source: "https://vi.wikipedia.org/wiki/Vi%E1%BB%87t_Nam"
  },
  {
    names: ["hồ tây", "ho tay"],
    area: "5,3 km²",
    area_note:
      "Số liệu diện tích tham khảo được biên soạn sẵn; cần đối chiếu nguồn đáng tin cậy trước khi sử dụng trong bài học.",
    source: "https://vi.wikipedia.org/wiki/H%E1%BB%93_T%C3%A2y"
  },
  {
    names: ["phú quốc", "dao phu quoc", "đảo phú quốc"],
    area: "574 km²",
    area_note:
      "Số liệu diện tích tham khảo của đảo; không đồng nhất với diện tích toàn thành phố hoặc đơn vị hành chính. Cần kiểm tra lại theo nguồn và phạm vi thống kê.",
    source: "https://vi.wikipedia.org/wiki/Ph%C3%BA_Qu%E1%BB%91c"
  }
];

function normalize(text = "") {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function makeQuiz() {
  return {
    question:
      "3 km² bằng bao nhiêu mét vuông (m²)?",
    options: [
      "3.000 m²",
      "3.000.000 m²",
      "300.000 m²",
      "30.000.000 m²"
    ],
    correct_index: 1,
    explanation:
      "Vì 1 km² = 1.000.000 m² nên 3 km² = 3 × 1.000.000 = 3.000.000 m²."
  };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=300");

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Chỉ hỗ trợ gửi câu hỏi bằng POST."
    });
  }

  const place =
    typeof req.body?.place === "string"
      ? req.body.place.trim()
      : "";

  if (!place || place.length > 160) {
    return res.status(400).json({
      error: "Vui lòng nhập tên địa danh tối đa 160 ký tự."
    });
  }

  try {
    const searchUrl = new URL(
      "https://vi.wikipedia.org/w/api.php"
    );

    searchUrl.search = new URLSearchParams({
      action: "query",
      list: "search",
      srsearch: place,
      srlimit: "1",
      format: "json",
      formatversion: "2"
    }).toString();

    const searchResponse = await fetch(searchUrl, {
      headers: { Accept: "application/json" }
    });

    if (!searchResponse.ok) {
      throw new Error("Không tìm kiếm được bài viết.");
    }

    const searchData = await searchResponse.json();
    const result = searchData.query?.search?.[0];

    if (!result) {
      return res.status(404).json({
        error:
          "Chưa tìm thấy địa danh. Hãy thử nhập tên đầy đủ hoặc tên phổ biến hơn."
      });
    }

    const title = result.title;
    const summaryUrl =
      "https://vi.wikipedia.org/api/rest_v1/page/summary/" +
      encodeURIComponent(title.replace(/ /g, "_"));

    const summaryResponse = await fetch(summaryUrl, {
      headers: { Accept: "application/json" }
    });

    if (!summaryResponse.ok) {
      throw new Error("Không lấy được phần giới thiệu.");
    }

    const page = await summaryResponse.json();
    const normalizedInput = normalize(place);

    const match = VERIFIED_PLACES.find((item) =>
      item.names.some((name) => {
        const normalizedName = normalize(name);
        return (
          normalizedInput === normalizedName ||
          normalize(title) === normalizedName
        );
      })
    );

let areaFromWiki = null;
let areaWikiUrl = null;

if (page.wikibase_item) {
  try {
    const wdUrl = new URL("https://www.wikidata.org/w/api.php");
    wdUrl.search = new URLSearchParams({
      action: "wbgetentities",
      ids: page.wikibase_item,
      props: "claims|sitelinks",
      format: "json"
    }).toString();

    const wdResponse = await fetch(wdUrl, {
      headers: { Accept: "application/json" }
    });

    if (wdResponse.ok) {
      const wdData = await wdResponse.json();
      const entity = wdData.entities?.[page.wikibase_item];
      const claims = entity?.claims?.P2046 || [];

      const claim = claims.find((item) =>
        item.rank === "preferred" &&
        item.mainsnak?.datavalue?.value?.amount
      ) || claims.find((item) =>
        item.rank !== "deprecated" &&
        item.mainsnak?.datavalue?.value?.amount
      );

      if (claim) {
        const value = claim.mainsnak.datavalue.value;
        const amount = Number(value.amount);
        const unit = String(value.unit || "").split("/").pop();

        const toKm2 = {
          Q712226: 1,       // km²
          Q25343: 0.000001, // m²
          Q35852: 0.01,     // hecta
          Q232291: 2.589988110336 // dặm vuông
        };

        if (
          Number.isFinite(amount) &&
          amount > 0 &&
          toKm2[unit] !== undefined
        ) {
          const km2 = amount * toKm2[unit];

          areaFromWiki =
            km2 >= 100
              ? km2.toLocaleString("vi-VN", {
                  maximumFractionDigits: 2
                }) + " km²"
              : km2.toLocaleString("vi-VN", {
                  maximumFractionDigits: 6
                }) + " km²";

          areaWikiUrl =
            "https://www.wikidata.org/wiki/" +
            page.wikibase_item;
        }
      }
    }
  } catch (error) {
    console.error("Wikidata area lookup:", error.message);
  }
}

    const extract = String(page.extract || "").trim();
    const sentences = extract
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) => sentence.length > 20);

    const facts = sentences.slice(0, 3);

    if (facts.length === 0) {
      facts.push(
        "Hãy mở bài viết tham khảo để tìm hiểu thêm về địa danh này."
      );
    }

    return res.status(200).json({
      title: page.title || title,
      subtitle: page.description || "Thông tin địa lí tham khảo",
     
area: match
  ? match.area
  : areaFromWiki || "Chưa xác minh được",

area_note: match
  ? match.area_note
  : areaFromWiki
    ? "Diện tích được lấy từ thuộc tính P2046 của Wikidata và quy đổi sang km². Cần mở nguồn để kiểm tra phạm vi địa lí, thời điểm thống kê và độ phù hợp với địa danh."
    : "Chưa tìm thấy số liệu diện tích có đơn vị phù hợp trong Wikidata. Hãy kiểm tra nguồn chính thức hoặc nguồn chuyên môn; website không tự suy đoán diện tích.",

      image_url:
        page.thumbnail?.source ||
        page.originalimage?.source ||
        "",
      article_url:
        page.content_urls?.desktop?.page ||
        "https://vi.wikipedia.org/wiki/" +
          encodeURIComponent(title.replace(/ /g, "_")),
      facts,
      sources: [...(areaWikiUrl
  ? [{
      title: "Dữ liệu diện tích trên Wikidata",
      url: areaWikiUrl
    }]
  : [])
      ],
      quiz: makeQuiz()
    });
  } catch (error) {
    console.error("Free lookup error:", error.message);

    return res.status(502).json({
      error:
        "Nguồn tra cứu miễn phí đang tạm thời không phản hồi. Vui lòng thử lại sau."
    });
  }
}
