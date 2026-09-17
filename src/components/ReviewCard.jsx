import { useNavigate } from 'react-router-dom'
import { StarIcon, MessageIcon, HeartIcon, FireIcon, ThumbUpIcon, ThumbDownIcon } from './Icons'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './ReviewCard.module.css'

function Stars({ rating }) {
  const full = Math.floor(rating / 2)
  const half = rating % 2 >= 1
  return (
    <span className={styles.stars}>
      {[0,1,2,3,4].map(i => (
        <StarIcon key={i} size={13} filled={i < full || (i === full && half)} />
      ))}
    </span>
  )
}

const REACTION_TYPES = [
  { type: 'like', Icon: HeartIcon, label: 'Curtir' },
  { type: 'fire', Icon: FireIcon, label: 'Incrível' },
  { type: 'agree', Icon: ThumbUpIcon, label: 'Concordo' },
  { type: 'disagree', Icon: ThumbDownIcon, label: 'Discordo' },
]

export default function ReviewCard({ review, reactions = [], onReactionChange }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleReaction = async (e, type) => {
    e.stopPropagation()
    const existing = reactions.find(r => r.user_id === user.id && r.type === type)
    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('reactions').insert({ review_id: review.id, user_id: user.id, type })
    }
    onReactionChange?.()
  }

  const ratingColor = review.rating >= 8 ? '#16a34a' : review.rating >= 6 ? '#ca8a04' : '#dc2626'

  return (
    <article className={styles.card} onClick={() => navigate(`/review/${review.id}`)}>
      <div className={styles.top}>
        <div className={styles.meta}>
          <span className={styles.genre}>{review.genre}</span>
          <span className={styles.type}>{review.game_type}</span>
        </div>
        <div className={styles.rating} style={{ color: ratingColor }}>
          {review.rating.toFixed(1)}
        </div>
      </div>

      <h2 className={styles.title}>{review.game_name}</h2>
      <Stars rating={review.rating} />

      <p className={styles.comment}>{review.comment}</p>

      <div className={styles.footer}>
        <div className={styles.author}>
          <div className={styles.authorAvatar}>
            {review.avatar_url
              ? <img src={review.avatar_url} alt="" />
              : <span>{(review.username || '?')[0].toUpperCase()}</span>
            }
          </div>
          <div>
            <span className={styles.authorName}>{review.username}</span>
            <span className={styles.date}>{new Date(review.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        <div className={styles.actions}>
          <span className={styles.commentCount} onClick={e => { e.stopPropagation(); navigate(`/review/${review.id}`) }}>
            <MessageIcon size={14} />
            {review.comment_count || 0}
          </span>
          {REACTION_TYPES.map(({ type, Icon }) => {
            const count = reactions.filter(r => r.type === type).length
            const active = reactions.some(r => r.user_id === user.id && r.type === type)
            return (
              <button
                key={type}
                className={`${styles.reactionBtn} ${active ? styles.active : ''}`}
                onClick={e => handleReaction(e, type)}
                title={type}
              >
                <Icon size={14} />
                {count > 0 && <span>{count}</span>}
              </button>
            )
          })}
        </div>
      </div>
    </article>
  )
}
