export default function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#fff', gap: '24px'
    }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>
        O CONSELHO BLAZE
      </div>
      <div style={{
        width: '32px', height: '32px', border: '2px solid #e8e8e8',
        borderTop: '2px solid #0a0a0a', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
    </div>
  )
}
