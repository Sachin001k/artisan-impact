import { supabase } from './supabaseClient.js'

export function initVolunteerForm() {
  const form = document.getElementById('volunteerForm')
  const successBox = document.getElementById('successBox')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('volunteers').insert({
      name: document.getElementById('vName').value,
      email: document.getElementById('vEmail').value,
      interest_area: document.getElementById('vArea').value,
      message: document.getElementById('vMsg').value,
    })

    if (!error) {
      form.style.display = 'none'
      successBox.style.display = 'block'
    } else {
      alert('Something went wrong submitting the form. Please try again.')
      console.error(error)
    }
  })
}
