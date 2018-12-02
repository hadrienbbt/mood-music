import createReducer from '../lib/createReducer'
import * as types from '../actions/types'

export const artists = createReducer({}, {
  [types.MOODMUSIC_TOP_ARTISTS](state, { payload }) {
    return payload.topArtists.reduce((acc,artist) => {
      acc[artist.id] = artist
      return acc
    },{})
  }
})
