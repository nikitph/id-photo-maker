<script>
  let { name, size = 20, stroke = 1.8, ...rest } = $props();
  const paths = {
    arrow: 'M5 12h14m-6-6 6 6-6 6', left: 'm14 6-6 6 6 6', down: 'm6 9 6 6 6-6', check: 'm5 12 4 4L19 6',
    camera: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    shield: 'M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm-4 9 3 3 5-6',
    lock: 'M6 10h12a2 2 0 0 1 2 2v8H4v-8a2 2 0 0 1 2-2Zm2 0V7a4 4 0 0 1 8 0v3m-4 5v2',
    photo: 'M4 3h16v18H4V3Zm0 13 5-5 4 4 3-3 4 4M9 7h.01',
    pen: 'm15 4 5 5M4 20l4-1L21 6l-5-5L3 14l-1 8 6-3',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 5 5',
    globe: 'M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z',
    info: 'M12 16v-5m0-3h.01M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0Z',
    help: 'M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0Z',
    upload: 'M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5',
    download: 'M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4',
    sparkle: 'm12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Zm8 0v4m-2-2h4',
    building: 'm3 8 9-5 9 5H3Zm2 3v7m5-7v7m4-7v7m5-7v7M3 21h18',
    book: 'M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15',
    cross: 'M12 3v18M3 12h18',
    briefcase: 'M8 7V3h8v4M3 7h18v14H3V7Zm0 6c6 4 12 4 18 0m-9 0v4',
    card: 'M3 5h18v14H3V5Zm4 4h3v4H7V9Zm7 1h4m-4 4h4M7 16h3',
    sliders: 'M5 3v4m0 6v8m7-18v10m0 6v2m7-18v4m0 6v8M2 7h6v6H2V7Zm7 6h6v6H9v-6Zm7-6h6v6h-6V7Z',
    clock: 'M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0ZM12 7v5l3 2',
    close: 'm6 6 12 12M6 18 18 6',
    refresh: 'M20 9a8 8 0 0 0-14-5L3 7m0-5v5h5m-4 8a8 8 0 0 0 14 5l3-3m0 5v-5h-5',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-7v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',
    share: 'M8 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm14-7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 14a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM8 10l8-4M8 14l8 4',
    wifi: 'M2 8c6-5 14-5 20 0M5 12c4-3 10-3 14 0m-11 4c2-2 6-2 8 0m-4 4h.01',
    face: 'M4 8V4h4m8 0h4v4m0 8v4h-4m-8 0H4v-4m5-7h.01M15 9h.01M8 14c2 3 6 3 8 0',
    volume: 'm3 9 4 0 5-5v16l-5-5H3V9Zm13-1c3 2 3 6 0 8m3-11c5 4 5 10 0 14',
    external: 'M14 3h7v7m-1-6-9 9m-1-9H3v17h17v-7',
    crop: 'M6 2v16h16M2 6h16v16',
    mail: 'M3 5h18v14H3V5Zm0 1 9 7 9-7',
    leaf: 'M20 3C9 2 2 6 5 15s16 5 15-12ZM5 20 15 9'
  };
</script>
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {...rest}><path d={paths[name] || paths.info}/></svg>
