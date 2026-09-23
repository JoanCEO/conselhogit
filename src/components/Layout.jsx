import { Outlet, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import {
  PlusIcon,
  UserIcon,
  LogOutIcon,
  GamepadIcon,
  MusicIcon,
  MegaphoneIcon,
  GavelIcon,
  LinkIcon,
  BellIcon,
  MenuIcon,
  XIcon
} from './Icons'
import ReviewModal from './ReviewModal'
import styles from './Layout.module.css'

export default function Layout() {
  const {
    user,
    profile,
    signOut
  } = useAuth()

  const navigate = useNavigate()

  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)

  const unreadCount = notifications.filter(
    notification => !notification.read
  ).length

  const sideNavigation = [
    {
      label: 'Avaliações',
      path: '/',
      icon: <GamepadIcon size={17} />
    },
    {
      label: 'Músicas',
      path: '/musicas',
      icon: <MusicIcon size={17} />
    },
    {
      label: 'Convocações',
      path: '/convocacoes',
      icon: <MegaphoneIcon size={17} />
    },
    {
      label: 'Julgamento',
      path: '/julgamento',
      icon: <GavelIcon size={17} />
    },
    {
      label: 'Links',
      path: '/links',
      icon: <LinkIcon size={17} />
    }
  ]

  useEffect(() => {
    if (!user?.id) return

    let mounted = true

    const channel = supabase
      .channel(`notifications-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        payload => {
          if (!mounted) return

          if (payload.new.user_id !== user.id) {
            return
          }

          setNotifications(current => {
            const exists = current.some(
              notification =>
                notification.id === payload.new.id
            )

            if (exists) {
              return current
            }

            return [
              payload.new,
              ...current
            ]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications'
        },
        payload => {
          if (!mounted) return

          if (payload.new.user_id !== user.id) {
            return
          }

          setNotifications(current =>
            current.map(notification =>
              notification.id === payload.new.id
                ? payload.new
                : notification
            )
          )
        }
      )
      .subscribe(status => {
        console.log(
          'Realtime notificações:',
          status
        )
      })

    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', {
          ascending: false
        })
        .limit(30)

      if (error) {
        console.error(
          'Erro ao carregar notificações:',
          error
        )
        return
      }

      if (!mounted) return

      setNotifications(data || [])
    }

    loadNotifications()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  const markAsRead = async notification => {
    if (!notification.read) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notification.id)

      setNotifications(current =>
        current.map(item =>
          item.id === notification.id
            ? { ...item, read: true }
            : item
        )
      )
    }

    setShowNotifications(false)

    if (notification.review_id) {
      navigate(`/review/${notification.review_id}`)
      return
    }

    if (notification.music_review_id) {
      navigate(`/musica/${notification.music_review_id}`)
      return
    }

    if (notification.convocacao_id) {
      navigate('/convocacoes')
      return
    }

    if (notification.julgamento_id) {
      navigate('/julgamento')
      return
    }
  }

  const markAllAsRead = async () => {
    if (!user?.id) return

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)

    setNotifications(current =>
      current.map(notification => ({
        ...notification,
        read: true
      }))
    )
  }

  const formatNotificationDate = date => {
    if (!date) return ''

    const notificationDate = new Date(date)
    const now = new Date()

    const diff =
      now.getTime() -
      notificationDate.getTime()

    const minutes = Math.floor(
      diff / 60000
    )

    if (minutes < 1) {
      return 'agora'
    }

    if (minutes < 60) {
      return `${minutes} min`
    }

    const hours = Math.floor(
      minutes / 60
    )

    if (hours < 24) {
      return `${hours}h`
    }

    const days = Math.floor(
      hours / 24
    )

    if (days < 7) {
      return `${days}d`
    }

    return notificationDate.toLocaleDateString(
      'pt-BR'
    )
  }

  return (
    <div className={styles.root}>

      <header className={styles.header}>

        <div className={styles.headerInner}>

          <Link
            to="/"
            className={styles.logoWrap}
            onClick={() => {
              setShowMobileMenu(false)
              setShowProfileMenu(false)
              setShowNotifications(false)
            }}
          >
            <span className={styles.logo}>
              O CONSELHO BLAZE
            </span>
          </Link>

          <div className={styles.headerRight}>

            {user && (
              <button
                type="button"
                className={styles.addBtn}
                onClick={() =>
                  setShowReviewModal(true)
                }
                title="Nova avaliação"
              >
                <PlusIcon size={19} />
              </button>
            )}

            {user && (
              <div className={styles.notificationWrap}>

                <button
                  type="button"
                  className={styles.notificationBtn}
                  onClick={() =>
                    setShowNotifications(
                      current => !current
                    )
                  }
                  aria-label="Notificações"
                >
                  <BellIcon size={19} />

                  {unreadCount > 0 && (
                    <span
                      className={
                        styles.notificationBadge
                      }
                    >
                      {unreadCount > 99
                        ? '99+'
                        : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div
                    className={
                      styles.notificationPanel
                    }
                  >

                    <div
                      className={
                        styles.notificationHeader
                      }
                    >
                      <strong>
                        Notificações
                      </strong>

                      {unreadCount > 0 && (
                        <button
                          type="button"
                          className={
                            styles.markAllBtn
                          }
                          onClick={
                            markAllAsRead
                          }
                        >
                          Marcar como lidas
                        </button>
                      )}
                    </div>

                    <div
                      className={
                        styles.notificationList
                      }
                    >

                      {notifications.length === 0 ? (
                        <div
                          className={
                            styles.emptyNotifications
                          }
                        >
                          Nenhuma notificação.
                        </div>
                      ) : (
                        notifications.map(
                          notification => (
                            <button
                              key={
                                notification.id
                              }
                              type="button"
                              className={`
                                ${styles.notificationItem}
                                ${
                                  !notification.read
                                    ? styles.notificationUnread
                                    : ''
                                }
                              `}
                              onClick={() =>
                                markAsRead(
                                  notification
                                )
                              }
                            >

                              <div
                                className={
                                  styles.notificationDot
                                }
                              >
                                {!notification.read && (
                                  <span />
                                )}
                              </div>

                              <div
                                className={
                                  styles.notificationContent
                                }
                              >
                                <strong>
                                  {
                                    notification.title
                                  }
                                </strong>

                                <span>
                                  {
                                    notification.content
                                  }
                                </span>

                                <small>
                                  {formatNotificationDate(
                                    notification.created_at
                                  )}
                                </small>
                              </div>

                            </button>
                          )
                        )
                      )}

                    </div>
                  </div>
                )}

              </div>
            )}

            {user && (
              <div
                className={styles.avatarWrap}
              >

                <button
                  type="button"
                  className={styles.avatar}
                  onClick={() =>
                    setShowProfileMenu(
                      current => !current
                    )
                  }
                  aria-label="Perfil"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                    />
                  ) : (
                    <span>
                      {(
                        profile?.username ||
                        user.email ||
                        '?'
                      )[0].toUpperCase()}
                    </span>
                  )}
                </button>

                {showProfileMenu && (
                  <div
                    className={styles.menu}
                  >
                    <Link
                      to={`/profile/${user.id}`}
                      className={
                        styles.menuItem
                      }
                      onClick={() =>
                        setShowProfileMenu(false)
                      }
                    >
                      <UserIcon size={17} />
                      Perfil
                    </Link>

                    <button
                      type="button"
                      className={
                        styles.menuItem
                      }
                      onClick={handleSignOut}
                    >
                      <LogOutIcon size={17} />
                      Sair
                    </button>
                  </div>
                )}

              </div>
            )}

            <button
              type="button"
              className={
                styles.mobileMenuBtn
              }
              onClick={() =>
                setShowMobileMenu(
                  current => !current
                )
              }
              aria-label="Abrir menu"
            >
              {showMobileMenu ? (
                <XIcon size={20} />
              ) : (
                <MenuIcon size={20} />
              )}
            </button>

          </div>

        </div>

        <div className={styles.headerLine} />

        {showMobileMenu && (
          <div
            className={styles.mobileMenu}
          >

            {sideNavigation.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={
                  styles.mobileMenuItem
                }
                onClick={() =>
                  setShowMobileMenu(false)
                }
              >
                {item.icon}
                {item.label}
              </Link>
            ))}

          </div>
        )}

      </header>

      <main className={styles.main}>

        <div className={styles.layoutArea}>

          <div className={styles.pageContent}>
            <Outlet />
          </div>

          <aside className={styles.sidePanel}>

            <div
              className={
                styles.sidePanelHeader
              }
            >
              <span>
                CONSELHO BLAZE
              </span>

              <small>
                NAVEGAÇÃO
              </small>
            </div>

            <nav className={styles.sideNav}>

              {sideNavigation.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={
                    styles.sideNavItem
                  }
                >
                  <span
                    className={
                      styles.sideNavIcon
                    }
                  >
                    {item.icon}
                  </span>

                  <span>
                    {item.label}
                  </span>
                </Link>
              ))}

            </nav>

          </aside>

        </div>

      </main>

      {showReviewModal && (
        <ReviewModal
          onClose={() =>
            setShowReviewModal(false)
          }
        />
      )}

    </div>
  )
}