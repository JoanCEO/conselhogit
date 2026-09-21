import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { ChevronLeftIcon, SpinnerIcon, EditIcon } from '../components/Icons'
import ReviewCard from '../components/ReviewCard'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, updateProfile } = useAuth()

  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const [reactions, setReactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    username: '',
    full_name: '',
    bio: '',
    avatar_url: ''
  })
  const [saving, setSaving] = useState(false)

  const isMe = user?.id === id

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      setProfile(p)

      setForm({
        username: p?.username || '',
        full_name: p?.full_name || '',
        bio: p?.bio || '',
        avatar_url: p?.avatar_url || ''
      })

      const { data: rv } = await supabase
        .from('reviews')
        .select('*, profiles:user_id(username, full_name, avatar_url)')
        .eq('user_id', id)
        .order('created_at', { ascending: false })

      const mapped = (rv || []).map(r => ({
        ...r,
        username: r.profiles?.username,
        avatar_url: r.profiles?.avatar_url,
        comment_count: 0,
      }))

      setReviews(mapped)

      const ids = (rv || []).map(r => r.id)

      if (ids.length) {
        const { data: rcts } = await supabase
          .from('reactions')
          .select('*')
          .in('review_id', ids)

        setReactions(rcts || [])
      }

      setLoading(false)
    }

    fetchProfile()
  }, [id])

  const handleSave = async () => {
    setSaving(true)

    const { data, error } = await updateProfile(form)

    if (!error) {
      setProfile(data)
      setEditing(false)
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className={styles.center}>
        <SpinnerIcon size={28} />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className={styles.center}>
        Perfil não encontrado.
      </div>
    )
  }

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    : null

  return (
    <div className={styles.page}>

      <button
        className={styles.back}
        onClick={() => navigate(-1)}
      >
        <ChevronLeftIcon size={18} />
        Voltar
      </button>

      <div className={styles.profileCard}>

        <div className={styles.avatarBig}>
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
            />
          ) : (
            <span>
              {(profile.username || '?')[0].toUpperCase()}
            </span>
          )}
        </div>

        {!editing ? (
          <div className={styles.profileInfo}>

            <div className={styles.nameRow}>
              <h1 className={styles.displayName}>
                {profile.full_name || profile.username}
              </h1>

              {isMe && (
                <button
                  className={styles.editBtn}
                  onClick={() => setEditing(true)}
                >
                  <EditIcon size={16} />
                  Editar perfil
                </button>
              )}
            </div>

            <p className={styles.username}>
              @{profile.username}
            </p>

            {memberSince && (
              <p className={styles.memberSince}>
                Membro desde {memberSince}
              </p>
            )}

            {profile.bio && (
              <p className={styles.bio}>
                {profile.bio}
              </p>
            )}

            <div className={styles.stats}>

              <div className={styles.stat}>
                <span className={styles.statNum}>
                  {reviews.length}
                </span>

                <span className={styles.statLabel}>
                  avaliações
                </span>
              </div>

              {avgRating && (
                <div className={styles.stat}>
                  <span className={styles.statNum}>
                    {avgRating}
                  </span>

                  <span className={styles.statLabel}>
                    média
                  </span>
                </div>
              )}

            </div>

          </div>
        ) : (

          <div className={styles.editForm}>

            <input
              placeholder="Nome completo"
              value={form.full_name}
              onChange={e =>
                setForm(f => ({
                  ...f,
                  full_name: e.target.value
                }))
              }
              className={styles.input}
            />

            <input
              placeholder="Username"
              value={form.username}
              onChange={e =>
                setForm(f => ({
                  ...f,
                  username: e.target.value
                }))
              }
              className={styles.input}
            />

            <input
              placeholder="URL da foto ou GIF"
              value={form.avatar_url}
              onChange={e =>
                setForm(f => ({
                  ...f,
                  avatar_url: e.target.value
                }))
              }
              className={styles.input}
            />

            {form.avatar_url && (
              <div className={styles.avatarPreview}>
                <img
                  src={form.avatar_url}
                  alt="Prévia do avatar"
                />
              </div>
            )}

            <textarea
              placeholder="Bio"
              value={form.bio}
              onChange={e =>
                setForm(f => ({
                  ...f,
                  bio: e.target.value
                }))
              }
              className={styles.textarea}
              rows={3}
            />

            <div className={styles.editActions}>

              <button
                onClick={() => setEditing(false)}
                className={styles.cancelBtn}
              >
                Cancelar
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className={styles.saveBtn}
              >
                {saving ? (
                  <SpinnerIcon size={16} />
                ) : (
                  'Salvar'
                )}
              </button>

            </div>

          </div>

        )}

      </div>

      {reviews.length > 0 && (
        <div className={styles.reviewsSection}>

          <h2 className={styles.sectionTitle}>
            Avaliações
          </h2>

          <div className={styles.grid}>

            {reviews.map(r => (
              <ReviewCard
                key={r.id}
                review={r}
                reactions={reactions.filter(
                  rx => rx.review_id === r.id
                )}
              />
            ))}

          </div>

        </div>
      )}

      {reviews.length === 0 && !loading && (
        <p className={styles.empty}>
          Nenhuma avaliação publicada ainda.
        </p>
      )}

    </div>
  )
}

