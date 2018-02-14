import * as types from './types'
import Spotify from 'react-native-spotify'
import { clientID,redirectURL } from '../private/conf'

export function initializeSpotify(){
    return (dispatch,getState) => {
        Spotify.initialize({
            clientID: clientID,
            redirectURL: redirectURL,
            scopes: [],
        }, (loggedIn, error) => {
            if (!error) dispatch({type: types.SPOTIFY_INIT, payload: { loggedIn }})
            else alert(JSON.stringify(error))
        })
    }
}

export function spotifyLogin() {
    return (dispatch,getState) => new Promise((resolve,reject) => {
        const callback = (loggedIn, error) => {
            if (!error) {
                dispatch({type: types.SPOTIFY_CONNECTION, payload: {loggedIn}})
                resolve()
            }
            else reject(error)
        }
        Spotify.login(callback)
    })
}

export function spotifyUserInfos(){
    return (dispatch,getState) => {
        Spotify.getMe((user,error) => {
            if(!error) dispatch({type: types.SPOTIFY_USER_INFOS, payload: { user}})
            else alert(JSON.stringify(error))
        })
    }
}