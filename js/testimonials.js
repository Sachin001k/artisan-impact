import { supabase } from './supabaseClient.js'

export async function loadTestimonials() {
  const grid = document.getElementById('testimonialGrid')
  if (!grid) return

  const { data, error } = await supabase
    .from('testimonials')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(6)

  if (error) {
    grid.innerHTML = `<p>Couldn't load reviews right now.</p>`
    console.error(error)
    return
  }

  if (!data || data.length === 0) {
    grid.innerHTML = `<p>No reviews yet — be the first to share one below.</p>`
    return
  }

  grid.innerHTML = data
    .map(
      (t) => `
    <div class="testimonial-card">
      <div class="stars">${'★'.repeat(t.rating || 5)}${'☆'.repeat(5 - (t.rating || 5))}</div>
      <p>"${t.quote}"</p>
      <span class="testimonial-name">${t.customer_name}</span>
    </div>`
    )
    .join('')
}

export function initTestimonialForm() {
  const form = document.getElementById('testimonialForm')
  if (!form) return
  const note = document.getElementById('testimonialNote')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('testimonials').insert({
      customer_name: document.getElementById('tName').value,
      rating: Number(document.getElementById('tRating').value),
      quote: document.getElementById('tQuote').value,
    })

    if (!error) {
      form.reset()
      note.textContent = 'Thanks for sharing — your review will appear once it\'s been checked.'
    } else {
      note.textContent = 'Something went wrong submitting your review. Please try again.'
      console.error(error)
    }
  })
}
