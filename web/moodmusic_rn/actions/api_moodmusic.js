import * as types from './types'
import Api from '../lib/api'

export function getMoodmusicTopArtists(id_user) {
    return async dispatch => {
        try {
            const topArtists = await Api.get(`/user/${id_user}/top-artists`)
            dispatch({type: types.MOODMUSIC_TOP_ARTISTS, payload: { topArtists }})
        } catch(error) {
            alert(error)
        }
    }
}
