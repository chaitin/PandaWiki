import { useCallback, useEffect, useRef, useState } from "react"

interface Heading {
  id: string
  title: string
  heading: number
}

const useScroll = (headings: Heading[]) => {
  const [activeHeading, setActiveHeading] = useState<Heading | null>(null)
  const isFirstLoad = useRef(true)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isManualScroll = useRef(false)

  const debounce = <T extends (...args: any[]) => any>(func: T, delay: number) => {
    return (...args: Parameters<T>) => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      scrollTimeoutRef.current = setTimeout(() => func(...args), delay)
    }
  }

  const scrollToElement = useCallback((elementId: string, offset = 80) => {
    const element = document.getElementById(elementId)
    if (element) {
      const targetHeading = headings.find(h => h.id === elementId)
      if (targetHeading) {
        isManualScroll.current = true
        setActiveHeading(targetHeading)
        location.hash = encodeURIComponent(targetHeading.title)

        const elementPosition = element.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.scrollY - offset

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })

        setTimeout(() => {
          isManualScroll.current = false
        }, 1000)
      }
    }
  }, [headings])

  const findActiveHeading = useCallback(() => {
    const levels = Array.from(new Set(headings.map(it => it.heading).sort((a, b) => a - b))).slice(0, 3)
    const visibleHeadings = headings.filter(header => levels.includes(header.heading))

    if (visibleHeadings.length === 0) return null

    const offset = 100
    let activeHeader: Heading | null = null

    for (let i = visibleHeadings.length - 1; i >= 0; i--) {
      const header = visibleHeadings[i]
      const element = document.getElementById(header.id)
      if (element) {
        const elementTop = element.getBoundingClientRect().top + window.scrollY
        if (elementTop <= window.scrollY + offset) {
          activeHeader = header
          break
        }
      }
    }

    if (!activeHeader && visibleHeadings.length > 0) {
      activeHeader = visibleHeadings[0]
    }

    return activeHeader
  }, [headings])

  const debouncedScrollHandler = useCallback(
    debounce(() => {
      if (isManualScroll.current) return

      const activeHeader = findActiveHeading()
      if (activeHeader && activeHeader.id !== activeHeading?.id) {
        setActiveHeading(activeHeader)
      }
    }, 100),
    [findActiveHeading, activeHeading]
  )

  useEffect(() => {
    if (isFirstLoad.current && headings.length > 0) {
      const hash = decodeURIComponent(location.hash).slice(1)
      if (hash) {
        const targetHeading = headings.find(header => header.title === hash)
        if (targetHeading) {
          setActiveHeading(targetHeading)
          setTimeout(() => {
            isManualScroll.current = true
            const element = document.getElementById(targetHeading.id)
            if (element) {
              const elementPosition = element.getBoundingClientRect().top
              const offsetPosition = elementPosition + window.scrollY - 80

              window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
              })
            }
            setTimeout(() => {
              isManualScroll.current = false
            }, 1000)
          }, 100)
        }
      } else {
        // 没有hash时，设置第一个标题为活跃状态并设置hash
        // const activeHeader = findActiveHeading()
        // if (activeHeader) {
        //   setActiveHeading(activeHeader)
        //   location.hash = encodeURIComponent(activeHeader.title)
        // }
      }
      isFirstLoad.current = false
    }
  }, [headings, findActiveHeading])

  useEffect(() => {
    if (headings.length === 0) return
    window.addEventListener('scroll', debouncedScrollHandler)
    debouncedScrollHandler()
    return () => {
      window.removeEventListener('scroll', debouncedScrollHandler)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [debouncedScrollHandler, headings])

  return {
    activeHeading,
    scrollToElement,
  }
}

export default useScroll