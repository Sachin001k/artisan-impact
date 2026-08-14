import { supabase } from './supabaseClient.js'

export async function loadStories() {
  const layout = document.getElementById('storiesLayout')
  if (!layout) return

  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, artists(name, age)')
    .order('published_at', { ascending: false })

  if (error || !posts || posts.length === 0) {
    layout.innerHTML = `<p>Couldn't load Art Diaries right now.</p>`
    console.error(error)
    return
  }

  const [featured, ...rest] = posts
  const monthLabel = (d) => new Date(d).toLocaleDateString('en-US', { month: 'long' })

  layout.innerHTML = `
    <div class="feature-card">
      <div class="tape"></div>
      <div class="eyebrow">This month's diary</div>
      <h3>${featured.title}${featured.artists ? ` — ${featured.artists.name}, ${featured.artists.age}` : ''}</h3>
      <p>${featured.excerpt || ''}</p>
      <div style="margin-top:22px;"><a href="post.html?slug=${featured.slug}" class="btn btn-ghost">Read the full diary</a></div>
    </div>

    <div class="mini-list">
      ${rest
        .slice(0, 4)
        .map(
          (p) => `
        <a class="mini-story" href="post.html?slug=${p.slug}">
          <div class="mini-thumb" style="background:linear-gradient(135deg, ${p.gradient_from}, ${p.gradient_to});"></div>
          <div><h4>${p.title}</h4><span>${monthLabel(p.published_at)} · Art Diaries</span></div>
        </a>`
        )
        .join('')}
    </div>
  `
}
