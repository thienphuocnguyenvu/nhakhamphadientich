export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Chỉ hỗ trợ gửi câu hỏi bằng POST.' });
  const place = typeof req.body?.place === 'string' ? req.body.place.trim() : '';
  if (!place || place.length > 160) return res.status(400).json({ error: 'Vui lòng nhập tên địa danh tối đa 160 ký tự.' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'Website chưa được cấu hình khóa API ở máy chủ. Giáo viên cần thêm OPENAI_API_KEY trong phần Environment Variables.' });

  const prompt = `Bạn là trợ lý giáo dục thân thiện dành cho học sinh lớp 5 tại Việt Nam. Hãy nghiên cứu địa danh: "${place}" bằng tìm kiếm web. Trả về kết quả CHỈ dưới dạng JSON hợp lệ, không markdown, với schema:
{
 "title":"Tên địa danh tiếng Việt",
 "subtitle":"Vị trí/loại địa danh, tối đa 100 ký tự",
 "area":"Diện tích và đơn vị, ưu tiên km²; nếu không tìm thấy nguồn đáng tin cậy ghi 'Chưa xác minh được'",
 "area_note":"Nêu phạm vi đo, năm hoặc sự khác nhau giữa nguồn nếu có; không đoán số liệu",
 "facts":["3 thông tin ngắn, đúng, phù hợp học sinh lớp 5"],
 "sources":[{"title":"Tên nguồn ngắn","url":"https://..."}],
 "quiz":{"question":"Một câu hỏi Toán lớp 5 liên quan đến diện tích hoặc chuyển đổi/so sánh diện tích","options":["A","B","C","D"],"correct_index":0,"explanation":"Giải thích phép tính dễ hiểu"}
}
Quy tắc: ưu tiên cơ quan nhà nước, cơ quan thống kê, ban quản lý địa danh, bách khoa uy tín hoặc tổ chức địa lí đáng tin. Có 2-4 nguồn URL thật sự liên quan, đặc biệt nguồn hỗ trợ số liệu diện tích. Không tạo URL hoặc nguồn giả. Địa danh có thể trùng tên thì nêu rõ bạn chọn địa danh nào; nếu không chắc, ghi chưa xác minh. Phân biệt diện tích đảo với đơn vị hành chính, diện tích mặt hồ với lưu vực, diện tích quốc gia với vùng lãnh thổ. Dùng số liệu có ghi chú về thời điểm/phạm vi; không khẳng định quá mức. Kiến thức ngắn, câu văn đơn giản, tích cực. Câu hỏi Toán phải giải được từ số liệu được nêu hoặc dùng đổi đơn vị 1 km² = 1.000.000 m²; phương án chỉ có một đáp án đúng. Không yêu cầu học sinh cung cấp thông tin cá nhân.`;
  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.5',
        tools: [{ type: 'web_search' }],
        tool_choice: 'required',
        input: prompt
      })
    });
    const raw = await upstream.json();
    if (!upstream.ok) {
      console.error('OpenAI API error', upstream.status, raw?.error?.message || 'unknown');
      return res.status(502).json({ error: 'Dịch vụ tra cứu đang gặp sự cố. Vui lòng thử lại sau.' });
    }
    const text = raw.output_text || (raw.output || []).flatMap(x => x.content || []).map(x => x.text || '').join('\n');
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    let data;
    try { data = JSON.parse(clean); } catch {
      const start = clean.indexOf('{'), end = clean.lastIndexOf('}');
      if (start < 0 || end <= start) throw new Error('Model returned no JSON');
      data = JSON.parse(clean.slice(start, end + 1));
    }
    const sources = Array.isArray(data.sources) ? data.sources.filter(s => s && typeof s.url === 'string' && /^https?:\/\//i.test(s.url)).slice(0, 6) : [];
    return res.status(200).json({
      title: String(data.title || place).slice(0, 160),
      subtitle: String(data.subtitle || 'Thông tin địa lí').slice(0, 200),
      area: String(data.area || 'Chưa xác minh được').slice(0, 120),
      area_note: String(data.area_note || 'Hãy mở nguồn tham khảo để kiểm tra phạm vi và thời điểm thống kê.').slice(0, 500),
      facts: Array.isArray(data.facts) ? data.facts.filter(x => typeof x === 'string').slice(0, 4).map(x => x.slice(0, 500)) : [],
      sources,
      quiz: data.quiz && typeof data.quiz.question === 'string' ? {
        question: data.quiz.question.slice(0, 500),
        options: Array.isArray(data.quiz.options) ? data.quiz.options.slice(0, 4).map(x => String(x).slice(0, 180)) : [],
        correct_index: Number.isInteger(data.quiz.correct_index) && data.quiz.correct_index >= 0 && data.quiz.correct_index <= 3 ? data.quiz.correct_index : 0,
        explanation: String(data.quiz.explanation || '').slice(0, 500)
      } : null
    });
  } catch (err) {
    console.error('Lookup error', err.message);
    return res.status(502).json({ error: 'Không xử lý được kết quả tra cứu. Vui lòng thử lại với tên địa danh rõ hơn.' });
  }
}
