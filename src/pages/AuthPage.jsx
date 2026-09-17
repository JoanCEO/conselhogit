import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { SpinnerIcon } from '../components/Icons'
import styles from './AuthPage.module.css'

export default function AuthPage() {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ email: '', password: '', username: '', full_name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)

    if (mode === 'signin') {
      const { error } = await signIn(form.email, form.password)
      if (error) setError(error.message)
      else navigate('/')
    } else {
      if (!form.username.trim()) { setError('Username obrigatório'); setLoading(false); return }
      const { error } = await signUp(form.email, form.password, form.username, form.full_name)
      if (error) setError(error.message)
      else setError('Verifique seu e-mail para confirmar o cadastro.')
    }
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <h1 className={styles.logo}>O CONSELHO BLAZE</h1>
          <p className={styles.tagline}>A plataforma privada de avaliações do Conselho</p>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'signin' ? styles.activeTab : ''}`}
            onClick={() => { setMode('signin'); setError('') }}
          >Entrar</button>
          <button
            className={`${styles.tab} ${mode === 'signup' ? styles.activeTab : ''}`}
            onClick={() => { setMode('signup'); setError('') }}
          >Cadastrar</button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <div className={styles.field}>
                <label>Nome completo</label>
                <input type="text" placeholder="Seu nome" value={form.full_name} onChange={e => set('full_name', e.target.value)} className={styles.input} />
              </div>
              <div className={styles.field}>
                <label>Username</label>
                <input type="text" placeholder="@username" value={form.username} onChange={e => set('username', e.target.value)} className={styles.input} required />
              </div>
            </>
          )}
          <div className={styles.field}>
            <label>E-mail</label>
            <input type="email" placeholder="seu@email.com" value={form.email} onChange={e => set('email', e.target.value)} className={styles.input} required />
          </div>
          <div className={styles.field}>
            <label>Senha</label>
            <input type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={e => set('password', e.target.value)} className={styles.input} required />
          </div>

          {error && <p className={`${styles.msg} ${error.includes('Verifique') ? styles.success : styles.error}`}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <SpinnerIcon size={18} /> : mode === 'signin' ? 'Entrar no Conselho' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
