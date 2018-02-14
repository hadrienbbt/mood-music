import createReducer from '../lib/createReducer'
import * as types from '../actions/types'

export const user = createReducer(null, {
    [types.SPOTIFY_USER_INFOS](state, { payload }) {
        const { id,display_name,email,country } = payload.user
        return {
            ...state,
            _id: id,
            name: display_name,
            email, country
        }
    },
    [types.MOODMUSIC_TOP_ARTISTS](state, { payload }) {
        return {
            ...state,
            topArtists: payload.topArtists
        }
    },
    [types.LOGOUT](state,_) {
        return null
    }
})