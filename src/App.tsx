import { TivioProvider, useAd, PlayerProvider, useTivioReadyData } from '@tivio/sdk-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { ChannelSource as ChannelSourceType, PlayerWrapper } from '@tivio/sdk-react';
import type { ChangeEvent } from 'react';

const PLAYER_ID = 'player-wrapper';

export let ChannelSource: ChannelSourceType | null;

const usePlayerWrapper = () => {
    const [playerWrapper, setPlayerWrapper] = useState<PlayerWrapper | null>(null);
    const tivioData = useTivioReadyData()

    useEffect(() => {
        if (tivioData) {
            ChannelSource = tivioData.sources.ChannelSource
            setPlayerWrapper(tivioData.getters.getPlayerWrapper({ playerWrapperId: PLAYER_ID }))
        }
    }, [tivioData])

    return playerWrapper
}

const AdButton = () => {
    const ad = useAd()

    useEffect(() => {
        console.log('Received ad metadata from Tivio', ad)
    }, [ad?.uri])

    if (ad) {
        const order = (ad.order && ad.totalCount) ? `${ad.order} / ${ad.totalCount}` : ''

        return <div>
            <div>AD {order}</div>
            {ad.isSkippable && <div>Can be skipped in {ad.secondsToSkippable} s</div>}
            <div>Will finish in {ad.secondsToEnd} s</div>
            {ad.isSkippable && <div>Can skip: {ad.canSkip ? 'true' : 'false'}</div>}
            <div>Is skippable: {ad.isSkippable ? 'true' : 'false'}</div>
            {ad.isSkippable && <button onClick={() => ad.skip()} disabled={!ad.canSkip}>Skip ad</button>}
        </div>
    } else {
        return null
    }
}

interface PlayerProps {
    playerWrapper: PlayerWrapper
}

const Player = (props: PlayerProps) => {
    const { playerWrapper } = props
    const videoRef = useRef<HTMLVideoElement | null>(null)

    useEffect(() => {
        console.log('Registering player implementation to Tivio')

        playerWrapper.register({
            pause: () => {
                console.log('Received pause() from Tivio')

                videoRef.current?.pause()
            },
            play: () => {
                console.log('Received play() from Tivio')

                videoRef.current?.play()
            },
            setSource: (playerSource) => {
                console.log('Received source from Tivio', playerSource.uri)

                if (videoRef.current) {
                    playerWrapper.onStateChanged('idle')

                    videoRef.current.src = null
                    videoRef.current.src = playerSource.uri

                    playerWrapper.play()
                }
            },
            seekTo: (ms) => {
                console.log(`Received seek from Tivio: ${ms} ms`)

                if (videoRef.current) {
                    const seconds = ms / 1000
                    videoRef.current.currentTime = seconds
                }
            },
            setVolume: (volume) => {
                console.log(`Received volume from Tivio: ${volume}`)

                if (videoRef.current) {
                    videoRef.current.volume = volume
                }
            },
            mute: () => {
                console.log(`Received mute from Tivio`)

                if (videoRef.current) {
                    videoRef.current.muted = true
                }
            },
            unmute: () => {
                console.log(`Received unmute from Tivio`)

                if (videoRef.current) {
                    videoRef.current.muted = false
                }
            },
        })

        videoRef.current.addEventListener('timeupdate', e => {
            const ms = Number(videoRef.current?.currentTime) * 1000

            console.log(`Signalling timeupdate to Tivio ${ms} ms`)

            playerWrapper.onTimeChanged(ms)
        })

        videoRef.current.addEventListener('ended', () => {
            console.log('Signalling playback ended to Tivio')

            playerWrapper.onStateChanged('idle')
            playerWrapper.onPlaybackEnded()
        })

        videoRef.current.addEventListener('play', () => {
            console.log('Signalling playing state to Tivio')

            playerWrapper.onStateChanged('playing')
        })

        videoRef.current.addEventListener('playing', () => {
            console.log('Signalling playing state to Tivio')

            playerWrapper.onStateChanged('playing')
        })

        videoRef.current.addEventListener('pause', () => {
            console.log('Signalling playing state to Tivio')

            playerWrapper.onStateChanged('paused')
        })

        videoRef.current.addEventListener('error', () => {
            console.log('Signalling error to Tivio')

            playerWrapper.onError(new Error('Failed to play'))
        })

        videoRef.current.addEventListener('durationchange', event => {
            const durationSec = videoRef.current.duration

            if (isFinite(durationSec)) {
                const durationMs = durationSec * 1000

                console.log(`Signalling duration change to Tivio: ${durationMs} ms`)

                playerWrapper.durationMs = durationMs
            }
        })
    }, [])

    const tivioPlay = useCallback(
        () => {
            playerWrapper.play()
        },
        [playerWrapper],
    )

    const tivioPause = useCallback(
        () => {
            playerWrapper.pause()
        },
        [playerWrapper],
    )

    const jumpForward = useCallback(
        () => {
            const ms = Number(videoRef.current?.currentTime) * 1000 + 2000
            playerWrapper.seekTo(ms)
        },
        [playerWrapper],
    )

    const setSourceTivio = useCallback(
        () => {
            const source = new ChannelSource(
                // TODO replace with your TV program video URI
                'https://firebasestorage.googleapis.com/v0/b/tivio-production-input-admin/o/organizations%2Fl0Q4o9TigUUTNe6TYAqR%2Fchannels%2FhL1LtUhcsZuygmi1HjJI%2Fsections%2FNQlUj81wIf0Ev6qQzRIs%2Fvideos%2F2hAoiSigTZ6Q4QyAsWAi.mp4?alt=media&token=041e129c-c034-42c5-8db0-9fb13c0e8d4e',
                {
                    /* any additional data, not touched by Tivio */
                },
                // channel name
                // can also be prima hd, prima_hd, prima, Prima, PRIMA, etc.
                // we will normalize it to snake case and add '_hd' if necessary
                //
                // Currently we support the following Prima channels:
                // Prima
                // Prima COOL
                // Prima Love
                // Prima MAX
                // Prima Krimi
                // Prima Star
                'Prima HD',
                // program name
                'Dr. House',
                // description (optional)
                'Episode about Dr. House being awesome',
                // EPG start
                new Date('2021-12-10T12:00:00'),
                // EPG end
                new Date('2021-12-10T13:40:00'),
            )

            playerWrapper.onSourceChanged(source)
        },
        [ playerWrapper ],
    )


    return (
        <>
            <video
                style={{
                    backgroundColor: '#eeeeee',
                    height: 420,
                }}
                ref={videoRef}
            />
            <div>
                <button style={{ margin: '20px 7px', cursor: 'pointer' }} onClick={setSourceTivio}>{'Set source'}</button>
                <button style={{ margin: '20px 7px', cursor: 'pointer' }} onClick={tivioPause}>{'Pause'}</button>
                <button style={{ margin: '20px 7px', cursor: 'pointer' }} onClick={tivioPlay}>{'Unpause'}</button>
                <button style={{ margin: '20px 7px', cursor: 'pointer' }} onClick={jumpForward}>{'+2s >>'}</button>
            </div>
            <AdButton/>
        </>
    )
}

const PlayerLoader = () => {
    const playerWrapper = usePlayerWrapper()

    if (playerWrapper) {
        return (
            <PlayerProvider playerWrapperId={PLAYER_ID}>
                <Player playerWrapper={playerWrapper}/>
            </PlayerProvider>
        )
    } else {
        return <div>Initializing Tivio Player...</div>
    }
}

const config = {
    secret: 'XXXXXXXXX',
    verbose: true,
}

function App() {
    return (
        <TivioProvider conf={config}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'sans-serif'
            }}>
                <h1>Tivio Player wrapper example</h1>
                <PlayerLoader/>
            </div>
        </TivioProvider>
    )
}

export default App
