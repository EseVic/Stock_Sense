import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  axios.defaults.baseURL = API

  useEffect(() => {
    const token = localStorage.getItem('ss_token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      axios.get('/api/me').then(r => setUser(r.data)).catch(() => localStorage.removeItem('ss_token')).finally(() => setLoading(false))
    } else { setLoading(false) }
  }, [])

  const login = async (email, password) => {
    const r = await axios.post('/api/login', { email, password })
    localStorage.setItem('ss_token', r.data.token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${r.data.token}`
    setUser(r.data.user)
    return r.data
  }

  const register = async (data) => {
    const r = await axios.post('/api/register', data)
    localStorage.setItem('ss_token', r.data.token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${r.data.token}`
    setUser(r.data.user)
    return r.data
  }

  const logout = () => {
    localStorage.removeItem('ss_token')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
