'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  CircularProgress,
  Divider,
  Collapse,
  IconButton,
} from '@mui/material'
import { useThemeMode } from '@/components/providers/ThemeProvider'
import SearchIcon from '@mui/icons-material/Search'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import CloudIcon from '@mui/icons-material/Cloud'
import AcUnitIcon from '@mui/icons-material/AcUnit'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import WaterDropIcon from '@mui/icons-material/WaterDrop'

interface HourlyWeather {
  time: string
  temp: number
  condition: string
  icon: string
  precipChance: number
}

interface WeatherData {
  location: string
  today: {
    temp: string
    condition: string
    icon: string
    hourly: HourlyWeather[]
  }
  tomorrow: {
    temp: string
    condition: string
    icon: string
    hourly: HourlyWeather[]
  }
}

export default function RightSidebar() {
  const { mode, toggleMode } = useThemeMode()
  const [location, setLocation] = useState<string>('Taipei')
  const [searchLocation, setSearchLocation] = useState<string>('')
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedToday, setExpandedToday] = useState(false)
  const [expandedTomorrow, setExpandedTomorrow] = useState(false)

  useEffect(() => {
    // Try to get location from localStorage, default to Taipei
    const savedLocation = localStorage.getItem('weatherLocation') || 'Taipei'
    setLocation(savedLocation)
    fetchWeather(savedLocation)
  }, [])

  const getCityName = async (lat: number, lon: number): Promise<string | null> => {
    try {
      // Using a free reverse geocoding service (nominatim)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        {
          headers: {
            'User-Agent': 'X-like App',
          },
        }
      )
      const data = await response.json()
      return data.address?.city || data.address?.town || data.address?.village || null
    } catch (error) {
      console.error('Geocoding error:', error)
      return null
    }
  }

  const fetchWeather = async (city: string) => {
    setLoading(true)
    try {
      // Using wttr.in - a free weather service that doesn't require API key
      const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`)
      if (response.ok) {
        const data = await response.json()
        const current = data.current_condition[0]
        const today = data.weather[0]
        const tomorrow = data.weather[1]

        // Process hourly data for today (next 24 hours from now)
        const now = new Date()
        const currentHour = now.getHours()
        const todayHourly: HourlyWeather[] = []
        const tomorrowHourly: HourlyWeather[] = []

        // Get today's remaining hours (from current hour to 23:00)
        for (let i = currentHour; i < 24 && i < today.hourly.length; i++) {
          const hourData = today.hourly[i]
          if (hourData) {
            // Extract hour from time string (format: "200" or "2000" or "20:00")
            let hour = i
            if (hourData.time) {
              const timeStr = hourData.time.toString()
              if (timeStr.includes(':')) {
                hour = parseInt(timeStr.split(':')[0])
              } else if (timeStr.length >= 2) {
                hour = parseInt(timeStr.slice(0, 2))
              }
            }
            todayHourly.push({
              time: `${String(hour).padStart(2, '0')}:00`,
              temp: parseInt(hourData.tempC || '0'),
              condition: hourData.weatherDesc?.[0]?.value || 'Clear',
              icon: getWeatherIcon(hourData.weatherCode || '113'),
              precipChance: parseInt(hourData.chanceofrain || '0'),
            })
          }
        }

        // Get tomorrow's hours to complete 24 hours for today
        const remainingHours = 24 - todayHourly.length
        for (let i = 0; i < remainingHours && i < tomorrow.hourly.length; i++) {
          const hourData = tomorrow.hourly[i]
          if (hourData) {
            let hour = i
            if (hourData.time) {
              const timeStr = hourData.time.toString()
              if (timeStr.includes(':')) {
                hour = parseInt(timeStr.split(':')[0])
              } else if (timeStr.length >= 2) {
                hour = parseInt(timeStr.slice(0, 2))
              }
            }
            todayHourly.push({
              time: `${String(hour).padStart(2, '0')}:00`,
              temp: parseInt(hourData.tempC || '0'),
              condition: hourData.weatherDesc?.[0]?.value || 'Clear',
              icon: getWeatherIcon(hourData.weatherCode || '113'),
              precipChance: parseInt(hourData.chanceofrain || '0'),
            })
          }
        }

        // Get tomorrow's full 24 hours
        for (let i = 0; i < 24 && i < tomorrow.hourly.length; i++) {
          const hourData = tomorrow.hourly[i]
          if (hourData) {
            let hour = i
            if (hourData.time) {
              const timeStr = hourData.time.toString()
              if (timeStr.includes(':')) {
                hour = parseInt(timeStr.split(':')[0])
              } else if (timeStr.length >= 2) {
                hour = parseInt(timeStr.slice(0, 2))
              }
            }
            tomorrowHourly.push({
              time: `${String(hour).padStart(2, '0')}:00`,
              temp: parseInt(hourData.tempC || '0'),
              condition: hourData.weatherDesc?.[0]?.value || 'Clear',
              icon: getWeatherIcon(hourData.weatherCode || '113'),
              precipChance: parseInt(hourData.chanceofrain || '0'),
            })
          }
        }

        setWeather({
          location: city,
          today: {
            temp: current.temp_C,
            condition: current.weatherDesc[0].value,
            icon: getWeatherIcon(current.weatherCode),
            hourly: todayHourly,
          },
          tomorrow: {
            temp: tomorrow.avgtempC,
            condition: tomorrow.hourly[4].weatherDesc[0].value,
            icon: getWeatherIcon(tomorrow.hourly[4].weatherCode),
            hourly: tomorrowHourly,
          },
        })
      }
    } catch (error) {
      console.error('Weather fetch error:', error)
      // Fallback: create mock weather data
      const mockHourly: HourlyWeather[] = []
      for (let i = 0; i < 24; i++) {
        mockHourly.push({
          time: `${String(i).padStart(2, '0')}:00`,
          temp: 22 + Math.floor(Math.random() * 5),
          condition: 'Partly Cloudy',
          icon: 'cloud',
          precipChance: Math.floor(Math.random() * 30),
        })
      }
      setWeather({
        location: city,
        today: {
          temp: '22',
          condition: 'Partly Cloudy',
          icon: 'cloud',
          hourly: mockHourly,
        },
        tomorrow: {
          temp: '24',
          condition: 'Sunny',
          icon: 'sunny',
          hourly: mockHourly.map((h) => ({ ...h, temp: h.temp + 2 })),
        },
      })
    } finally {
      setLoading(false)
    }
  }

  const getWeatherIcon = (code: string): string => {
    const codeNum = parseInt(code)
    if (codeNum >= 113 && codeNum <= 116) return 'sunny'
    if (codeNum >= 119 && codeNum <= 122) return 'cloud'
    if (codeNum >= 143 && codeNum <= 248) return 'cloud'
    if (codeNum >= 260 && codeNum <= 263) return 'cloud'
    if (codeNum >= 266 && codeNum <= 272) return 'rain'
    if (codeNum >= 281 && codeNum <= 284) return 'snow'
    if (codeNum >= 293 && codeNum <= 296) return 'rain'
    if (codeNum >= 299 && codeNum <= 302) return 'rain'
    if (codeNum >= 305 && codeNum <= 308) return 'rain'
    if (codeNum >= 311 && codeNum <= 314) return 'rain'
    if (codeNum >= 335 && codeNum <= 338) return 'snow'
    if (codeNum >= 350 && codeNum <= 353) return 'snow'
    if (codeNum >= 356 && codeNum <= 359) return 'rain'
    if (codeNum >= 362 && codeNum <= 365) return 'snow'
    if (codeNum >= 368 && codeNum <= 371) return 'snow'
    if (codeNum >= 395 && codeNum <= 398) return 'snow'
    return 'cloud'
  }

  const handleSearch = () => {
    if (searchLocation.trim()) {
      setLocation(searchLocation.trim())
      localStorage.setItem('weatherLocation', searchLocation.trim())
      fetchWeather(searchLocation.trim())
      setSearchLocation('')
    }
  }

  const renderWeatherIcon = (icon: string, size: number = 40) => {
    switch (icon) {
      case 'sunny':
        return <WbSunnyIcon sx={{ fontSize: size, color: '#FFA500' }} />
      case 'cloud':
        return <CloudIcon sx={{ fontSize: size, color: '#808080' }} />
      case 'snow':
        return <AcUnitIcon sx={{ fontSize: size, color: '#87CEEB' }} />
      default:
        return <CloudIcon sx={{ fontSize: size, color: '#808080' }} />
    }
  }

  const renderWeatherChart = (hourly: HourlyWeather[], label: string) => {
    if (!hourly || hourly.length === 0) return null

    const temps = hourly.map((h) => h.temp)
    const maxTemp = Math.max(...temps)
    const minTemp = Math.min(...temps)
    const tempRange = maxTemp - minTemp || 1
    const chartHeight = 150
    const chartWidth = Math.max(hourly.length * 50, 600)

    return (
      <Box sx={{ mt: 2 }}>
        <Box
          sx={{
            position: 'relative',
            height: chartHeight + 100,
            overflowX: 'auto',
            overflowY: 'visible',
            width: '100%',
          }}
        >
          {/* Temperature chart */}
          <Box
            sx={{
              position: 'relative',
              height: chartHeight,
              width: chartWidth,
              mb: 4,
            }}
          >
            {/* Y-axis labels */}
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 30,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              {[maxTemp, Math.round((maxTemp + minTemp) / 2), minTemp].map((temp, index) => (
                <Typography
                  key={`temp-${index}-${temp}`}
                  variant="caption"
                  sx={{ fontSize: '10px', color: 'text.secondary' }}
                >
                  {temp}°
                </Typography>
              ))}
            </Box>

            {/* Temperature area */}
            <Box
              sx={{
                position: 'absolute',
                left: 35,
                right: 0,
                top: 0,
                bottom: 0,
              }}
            >
              <svg
                width={chartWidth - 35}
                height={chartHeight}
                style={{ overflow: 'visible' }}
              >
                {/* Temperature fill area */}
                <defs>
                  <linearGradient id={`tempGradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FF6B6B" />
                    <stop offset="100%" stopColor="#FFD93D" />
                  </linearGradient>
                </defs>
                {hourly.length > 1 && (
                  <>
                    <path
                      d={`M 0,${chartHeight} ${hourly
                        .map(
                          (h, i) =>
                            `L ${(i / (hourly.length - 1)) * (chartWidth - 35)},${
                              chartHeight - ((h.temp - minTemp) / tempRange) * chartHeight
                            }`
                        )
                        .join(' ')} L ${chartWidth - 35},${chartHeight} Z`}
                      fill={`url(#tempGradient-${label})`}
                      fillOpacity={0.3}
                    />
                    {/* Temperature line */}
                    <polyline
                      points={hourly
                        .map(
                          (h, i) =>
                            `${(i / (hourly.length - 1)) * (chartWidth - 35)},${
                              chartHeight - ((h.temp - minTemp) / tempRange) * chartHeight
                            }`
                        )
                        .join(' ')}
                      fill="none"
                      stroke="#FF6B6B"
                      strokeWidth={2}
                    />
                  </>
                )}
              </svg>
            </Box>

            {/* Hourly data points - positioned at temperature points */}
            {hourly.map((hour, index) => {
              const yPos = chartHeight - ((hour.temp - minTemp) / tempRange) * chartHeight
              return (
                <Box
                  key={index}
                  sx={{
                    position: 'absolute',
                    left: `${35 + (index / (hourly.length - 1)) * (chartWidth - 35)}px`,
                    top: `${yPos - 30}px`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <Box sx={{ mb: 0.5 }}>{renderWeatherIcon(hour.icon, 16)}</Box>
                  <Typography variant="caption" sx={{ fontSize: '10px', fontWeight: 'bold' }}>
                    {hour.temp}°
                  </Typography>
                </Box>
              )
            })}

            {/* Hourly time labels at bottom */}
            <Box
              sx={{
                position: 'absolute',
                left: 35,
                top: chartHeight + 5,
                width: chartWidth - 35,
                display: 'flex',
                justifyContent: 'space-between',
                px: 0.5,
              }}
            >
              {hourly.map((hour, index) => {
                const xPos = (index / (hourly.length - 1)) * 100
                return (
                  <Typography
                    key={index}
                    variant="caption"
                    sx={{
                      fontSize: '9px',
                      color: 'text.secondary',
                      position: 'absolute',
                      left: `${xPos}%`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    {hour.time}
                  </Typography>
                )
              })}
            </Box>
          </Box>

          {/* Precipitation probability bar */}
          <Box sx={{ position: 'relative', height: 60, mt: 2, width: chartWidth }}>
            <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary', mb: 0.5 }}>
              Precipitation Probability
            </Typography>
            <Box
              sx={{
                display: 'flex',
                gap: 0.5,
                alignItems: 'flex-end',
                height: 40,
              }}
            >
              {hourly.map((hour, index) => (
                <Box
                  key={index}
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 40,
                  }}
                >
                  <Box
                    sx={{
                      width: '100%',
                      height: `${Math.min(hour.precipChance * 0.3, 100)}%`,
                      bgcolor: 'primary.light',
                      borderRadius: '2px 2px 0 0',
                      minHeight: hour.precipChance > 0 ? '2px' : '0',
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ fontSize: '8px', color: 'text.secondary', mt: 0.5 }}
                  >
                    {hour.precipChance}%
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        width: { xs: 300, md: 300, lg: 350 },
        p: 2,
        flexShrink: 0, // 防止被压缩，允许横向滚动
        overflowY: 'auto', // 纵向滚动
        overflowX: 'hidden',
        height: '100vh', // 视口高度
        minWidth: { xs: 300, md: 300, lg: 350 }, // 确保最小宽度，允许横向滚动
      }}
    >
      {/* Switch Color */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Settings
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={mode === 'dark'}
              onChange={toggleMode}
              color="primary"
            />
          }
          label={mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
        />
      </Paper>

      {/* Weather */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationOnIcon />
          Weather
        </Typography>

        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Search location..."
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch()
              }
            }}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            startIcon={<SearchIcon />}
            size="small"
          >
            Search
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : weather ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {weather.location}
            </Typography>

            {/* Today */}
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
                onClick={() => setExpandedToday(!expandedToday)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
                  {renderWeatherIcon(weather.today.icon)}
                  <Box>
                    <Typography variant="subtitle2">Today</Typography>
                    <Typography variant="h6">{weather.today.temp}°C</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {weather.today.condition}
                    </Typography>
                  </Box>
                </Box>
                <IconButton size="small">
                  {expandedToday ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              <Collapse in={expandedToday}>
                {renderWeatherChart(weather.today.hourly, 'today')}
              </Collapse>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Tomorrow */}
            <Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
                onClick={() => setExpandedTomorrow(!expandedTomorrow)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
                  {renderWeatherIcon(weather.tomorrow.icon)}
                  <Box>
                    <Typography variant="subtitle2">Tomorrow</Typography>
                    <Typography variant="h6">{weather.tomorrow.temp}°C</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {weather.tomorrow.condition}
                    </Typography>
                  </Box>
                </Box>
                <IconButton size="small">
                  {expandedTomorrow ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
              <Collapse in={expandedTomorrow}>
                {renderWeatherChart(weather.tomorrow.hourly, 'tomorrow')}
              </Collapse>
            </Box>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Search for a location to see weather
          </Typography>
        )}
      </Paper>
    </Box>
  )
}











