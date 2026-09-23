import { useNavigate } from 'react-router-dom'
import {
  StarIcon,
  MessageIcon,
  HeartIcon,
  FireIcon,
  ThumbUpIcon,
  ThumbDownIcon
} from './Icons'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import styles from './MusicReviewCard.module.css'

function Stars({ rating }) {
  const full = Math.floor(rating / 2)
  const half = rating % 2 >= 1

  return (
    <span className={styles.stars}>
      {[0, 1, 2, 3, 4].map(i => (
        <StarIcon
          key={i}
          size={13}
          filled={
            i < full ||
            (i === full && half)
          }
        />
      ))}
    </span>
  )
}

const REACTION_TYPES = [
  {
    type: 'like',
    Icon: HeartIcon,
    label: 'Curtir'
  },
  {
    type: 'fire',
    Icon: FireIcon,
    label: 'Incrível'
  },
  {
    type: 'agree',
    Icon: ThumbUpIcon,
    label: 'Concordo'
  },
  {
    type: 'disagree',
    Icon: ThumbDownIcon,
    label: 'Discordo'
  }
]

export default function MusicReviewCard({
  review,
  reactions = [],
  onReactionChange
}) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleReaction = async (e, type) => {
    e.stopPropagation()

    if (!user) return

    const existing = reactions.find(
      reaction =>
        reaction.user_id === user.id &&
        reaction.type === type
    )

    if (existing) {
      const { error } = await supabase
        .from('music_reactions')
        .delete()
        .eq('id', existing.id)

      if (error) {
        console.error(
          'Erro ao remover reação musical:',
          error
        )

        return
      }
    } else {
      const { error } = await supabase
        .from('music_reactions')
        .insert({
          music_review_id: review.id,
          user_id: user.id,
          type
        })

      if (error) {
        console.error(
          'Erro ao adicionar reação musical:',
          error
        )

        return
      }
    }

    onReactionChange?.()
  }

  const ratingColor =
    review.rating >= 8
      ? '#16a34a'
      : review.rating >= 6
        ? '#ca8a04'
        : '#dc2626'

  return (
    <article
      className={styles.card}
      onClick={() =>
        navigate(
          `/musica/${review.id}`
        )
      }
    >
      <div className={styles.top}>

        <div className={styles.meta}>
          <span className={styles.genre}>
            {review.genre}
          </span>

          {review.album_name && (
            <span className={styles.type}>
              {review.album_name}
            </span>
          )}
        </div>

        <div
          className={styles.rating}
          style={{
            color: ratingColor
          }}
        >
          {Number(
            review.rating
          ).toFixed(1)}
        </div>

      </div>

      <h2 className={styles.title}>
        {review.music_name}
      </h2>

      <p className={styles.artist}>
        {review.artist_name}
      </p>

      {review.music_image && (
        <div className={styles.musicCover}>
          <img
            src={review.music_image}
            alt=""
          />
        </div>
      )}

      <Stars rating={review.rating} />

      <p className={styles.comment}>
        {review.comment}
      </p>

      <div className={styles.footer}>

        <div className={styles.author}>

          <div
            className={
              styles.authorAvatar
            }
          >
            {review.avatar_url ? (
              <img
                src={review.avatar_url}
                alt=""
              />
            ) : (
              <span>
                {(
                  review.username || '?'
                )[0].toUpperCase()}
              </span>
            )}
          </div>

          <div>
            <span
              className={
                styles.authorName
              }
            >
              {review.username}
            </span>

            <span
              className={styles.date}
            >
              {new Date(
                review.created_at
              ).toLocaleDateString(
                'pt-BR'
              )}
            </span>
          </div>

        </div>

        <div className={styles.actions}>

          <span
            className={
              styles.commentCount
            }
            onClick={e => {
              e.stopPropagation()

              navigate(
                `/musica/${review.id}`
              )
            }}
          >
            <MessageIcon size={14} />

            {review.comment_count || 0}
          </span>

          {REACTION_TYPES.map(
            ({
              type,
              Icon,
              label
            }) => {

              const count =
                reactions.filter(
                  reaction =>
                    reaction.type === type
                ).length

              const active =
                reactions.some(
                  reaction =>
                    reaction.user_id ===
                      user?.id &&
                    reaction.type ===
                      type
                )

              return (
                <button
                  key={type}
                  type="button"
                  className={`${
                    styles.reactionBtn
                  } ${
                    active
                      ? styles.active
                      : ''
                  }`}
                  onClick={e =>
                    handleReaction(
                      e,
                      type
                    )
                  }
                  title={label}
                >
                  <Icon size={14} />

                  {count > 0 && (
                    <span>
                      {count}
                    </span>
                  )}
                </button>
              )
            }
          )}

        </div>

      </div>
    </article>
  )
}