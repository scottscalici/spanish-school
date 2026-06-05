import { useState, useEffect } from 'react';

const CONFIG = {
    COURSE: "s2", // Change to "s2" as needed
    TAREAS: "https://raw.githubusercontent.com/scottscalici/imagenes/main/planes/tareas.json",
    CALENDARIO: "https://raw.githubusercontent.com/scottscalici/imagenes/main/planes/calendario.json",
    VOCAB_BANK: "https://raw.githubusercontent.com/scottscalici/imagenes/main/planes/vocabulario.json",
    ANUNCIOS: "https://raw.githubusercontent.com/scottscalici/imagenes/main/planes/anuncios.json",
    WORDS: "https://raw.githubusercontent.com/scottscalici/imagenes/main/juegos/senordle/words.json",
    DICTIONARY: "https://raw.githubusercontent.com/bayu01/Wordle-ES/master/palabras_de_cinco_letras.txt",
    EVALS: "https://raw.githubusercontent.com/scottscalici/imagenes/main/planes/evaluaciones.json",
    CURIOSIDADES: "https://raw.githubusercontent.com/scottscalici/imagenes/main/planes/curiosidades.json",
    DESTACADO: "https://raw.githubusercontent.com/scottscalici/imagenes/main/planes/destacadodiario.json",
    APUNTES: "https://raw.githubusercontent.com/scottscalici/imagenes/main/planes/apuntes.json",
    TEMAS: "https://raw.githubusercontent.com/scottscalici/imagenes/main/planes/temas.json",
    GRAMATICA_DIARIA: "https://raw.githubusercontent.com/scottscalici/imagenes/main/planes/gramatica_diaria.json",
    
    // 🔗 THE GAME DATA URL
    ATANDO: "https://raw.githubusercontent.com/scottscalici/imagenes/main/juegos/eslabon_perdido/eslabon_perdido.json",
    
    // 📚 CONTENT URLs
    EXTRAS: "https://raw.githubusercontent.com/scottscalici/imagenes/main/planes/extras_diarios.json",
    VIDEOS: "https://raw.githubusercontent.com/scottscalici/imagenes/main/planes/videos.json",
    PRACTICAS: "https://raw.githubusercontent.com/scottscalici/imagenes/main/planes/practicas.json",
    MUSICA: "https://raw.githubusercontent.com/scottscalici/imagenes/main/planes/musica.json",
    LECTURA: "https://raw.githubusercontent.com/scottscalici/imagenes/main/planes/lectura.json",
    CONVERSA: "https://raw.githubusercontent.com/scottscalici/imagenes/main/planes/conversaciones.json",
    CULTURA: "https://raw.githubusercontent.com/scottscalici/imagenes/main/planes/cultura.json"
};

// 🧹 THE NORMALIZATION ENGINE
// Converts various JSON formats into a single "Activity" standard
const normalizeActivities = (raw) => {
    let activities = [];

    // 1. EXTRAS
    if (raw.extras?.items) {
        raw.extras.items.forEach(item => {
            activities.push({
                id: item.id,
                type: "extra",
                title: item.title,
                url: item.url || item.links?.[0]?.url,
                img: item.img,
                tag: item.tag || "Extra",
                s2_dias: item.s2_dias || [],
                s4_dias: item.s4_dias || [],
                raw: item
            });
        });
    }

    // 2. MUSICA, LECTURA, CONVERSA, CULTURA
    const processCategory = (source, typeName) => {
        if (!source?.items) return;
        Object.keys(source.items).forEach(key => {
            const item = source.items[key];
            activities.push({
                id: key,
                type: typeName,
                title: item.titulo,
                subtitle: item.subtitulo,
                url: item.url,
                img: item.imagen,
                tag: item.tag,
                s2_dias: item.courses?.includes('s2') ? (item.dias || []) : [],
                s4_dias: item.courses?.includes('s4') ? (item.dias || []) : [],
                raw: item
            });
        });
    };
    processCategory(raw.musica, "musica");
    processCategory(raw.lectura, "lectura");
    processCategory(raw.conversa, "conversacion");
    processCategory(raw.cultura, "cultura");

    // 3. VIDEOS
    if (raw.videos?.daily_tags) {
        raw.videos.daily_tags.forEach(item => {
            activities.push({
                id: item.id,
                type: "video",
                title: item.title,
                subtitle: item.description,
                url: item.page_url || item.video_url,
                img: item.thumbnail_url,
                tag: item.tags?.find(t => t !== 's2' && t !== 's4') || "Video",
                s2_dias: item.tags?.includes('s2') ? [item.dia] : [],
                s4_dias: item.tags?.includes('s4') ? [item.dia] : [],
                raw: item
            });
        });
    }

    // 4. PRACTICAS
    if (raw.practicas?.practicas) {
        raw.practicas.practicas.forEach((item, idx) => {
            activities.push({
                id: `practica-${idx}`,
                type: "practica",
                title: item.title,
                subtitle: "Práctica IB",
                url: null,
                img: null,
                tag: "Práctica",
                s2_dias: item.courses?.includes('s2') ? (item.dias || []) : [],
                s4_dias: item.courses?.includes('s4') ? (item.dias || []) : [],
                raw: item
            });
        });
    }

    // 🎯 NEW: 5. ESLABONES (ATANDO CABOS)
    if (raw.atando?.eslabones) {
        raw.atando.eslabones.forEach(item => {
            activities.push({
                id: String(item.id),
                type: "eslabones", // Triggers the Game UI
                title: item.theme,
                subtitle: "El Eslabón Perdido",
                url: null,
                img: null,
                tag: "Juego",
                s2_dias: item.course?.includes('s2') ? [parseInt(item.dia)] : [],
                s4_dias: item.course?.includes('s4') ? [parseInt(item.dia)] : [],
                raw: item // Contains the 'chain' array
            });
        });
    }

    return activities;
};

export const useGymData = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [liveDia, setLiveDia] = useState(1);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const safeFetchJSON = (url) => fetch(url).then(r => r.ok ? r.json() : {}).catch(() => ({}));
                const safeFetchText = (url) => fetch(url).then(r => r.ok ? r.text() : "").catch(() => "");
                
                // 📡 FETCH ALL DATA IN PARALLEL
                const [
                    tareas, cal, vocab, anuncios, words, dictText, evals, curios, destacado, 
                    apuntes, temas, gramD, atando, 
                    extras, videos, practicas, musica, lectura, conversa, cultura
                ] = await Promise.all([
                    safeFetchJSON(CONFIG.TAREAS), safeFetchJSON(CONFIG.CALENDARIO), safeFetchJSON(CONFIG.VOCAB_BANK), 
                    safeFetchJSON(CONFIG.ANUNCIOS), safeFetchJSON(CONFIG.WORDS), safeFetchText(CONFIG.DICTIONARY), 
                    safeFetchJSON(CONFIG.EVALS), safeFetchJSON(CONFIG.CURIOSIDADES), safeFetchJSON(CONFIG.DESTACADO), 
                    safeFetchJSON(CONFIG.APUNTES), safeFetchJSON(CONFIG.TEMAS), safeFetchJSON(CONFIG.GRAMATICA_DIARIA), 
                    safeFetchJSON(CONFIG.ATANDO), safeFetchJSON(CONFIG.EXTRAS), safeFetchJSON(CONFIG.VIDEOS), 
                    safeFetchJSON(CONFIG.PRACTICAS), safeFetchJSON(CONFIG.MUSICA), safeFetchJSON(CONFIG.LECTURA), 
                    safeFetchJSON(CONFIG.CONVERSA), safeFetchJSON(CONFIG.CULTURA)
                ]);

                // 🗓️ DATE LOGIC
                const validDictionary = dictText.split('\n').map(word => word.trim().toUpperCase()).filter(word => word.length === 5);
                const calendarArray = cal.map || (Array.isArray(cal) ? cal : []);
                const todayStr = new Date().toLocaleDateString('en-CA');
                const pastEntries = calendarArray.filter(c => c.fecha && c.fecha <= todayStr && c.dia != null);
                const currentDay = pastEntries.length > 0 ? parseInt(pastEntries.sort((a, b) => b.fecha.localeCompare(a.fecha))[0].dia) : 1;

                // 🪄 RUN THE NORMALIZATION (Including the new 'atando' data)
                const allActivities = normalizeActivities({
                    extras, videos, practicas, musica, lectura, conversa, cultura, atando
                });

                setLiveDia(currentDay);
                setData({ 
                    tareas, cal: calendarArray, vocab, anuncios, words, dictionary: validDictionary, 
                    evals, curios, destacado, apuntes, temas, gramD, atando,
                    activities: allActivities 
                });
            } catch (error) {
                console.error("Error fetching data:", error);
                setData({}); 
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, []);

    return { data, loading, liveDia, setLiveDia, course: CONFIG.COURSE };
};