import createReducer from '../lib/createReducer'
import * as types from '../actions/types'

export const api_spotify = createReducer({
    initialized: false,
    loggedIn: false
}, {
    [types.SPOTIFY_INIT](state, { payload }) {
        return {
            ...state,
            initialized: true,
            loggedIn: payload.loggedIn,
        }
    },
    [types.SPOTIFY_CONNECTION](state, { payload }) {
        return {
            ...state,
            loggedIn: payload.loggedIn
        }
    },
})