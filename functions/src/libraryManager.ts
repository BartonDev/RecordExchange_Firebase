import {UniversalTrack, UniversalPlaylist} from "./musicObjects"
import {getAppleToken} from './AppleTokenManager';

const fetch = require('cross-fetch')

//SPOTIFY

export function addPlaylistToLibrarySpotify (authCode:string, playlist: UniversalPlaylist):any{
    return new Promise (function (resolve, reject) {
        getUserIdSpotify(authCode)
        .then((userId:string) =>{
            createSpotifyPlaylist(authCode, userId, playlist)
            .then(()=>{
                resolve()
            })
        })
        .catch((error:Error) =>{
            reject(error)
        })
    })
}

function createSpotifyPlaylist (authCode: string, userId: string, playlist: UniversalPlaylist):any {
    return new Promise (function (resolve, reject) {
        const url = `https://api.spotify.com/v1/users/${userId}/playlists`

        let playlistData = {
            name: playlist.name,
            description: playlist.description,
            public: false,
        }

        const options = {
            method: 'POST',
            headers: {
                Authorization: authCode,
                "Content-Type": 'application/json',
            },
            body: JSON.stringify(playlistData)
        };

        let trackUris = tracksToUrisSpotify(playlist.tracks)

        fetch(url, options)
        .then( (res:any) => res.json())
        .then( (data:any) => {
            let playlistId = data.id
            addTracksToPlaylistSpotify(authCode, playlistId, trackUris)
            .then( () =>{
                resolve()
            })
        })
        .catch((error:Error) => {
            reject(error)
        })

    })
}

function getUserIdSpotify (authCode: string):any {
    return new Promise (function(resolve, reject) {
        const url = "https://api.spotify.com/v1/me"

        const options = {
            method: 'GET',
            headers: {
                Authorization: authCode,
                "Content-Type": 'application/json'
            },
        };
    
        fetch(url, options)
        .then( (res:any) => res.json())
        .then( (data:any) => {
            let userId = data.id
            resolve(userId)
        })
        .catch((error:Error) => {
            reject(error)
        })
    })
}

function tracksToUrisSpotify (tracks: Array<UniversalTrack>):Array<string> {
    var uris = Array<string>()
    for (let track of tracks){
        let uri = "spotify:track:".concat(track.spotifyId)
        uris.push(uri)
    }
    return uris 
}

//TODO hard limit on 100 tracks at a time, need something recursive to handle 100+ tracks
function addTracksToPlaylistSpotify (authCode: string, playlistId: string, uris: Array<string>): any {
    const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`

    let data = {
        uris: uris
    }
    const options = {
        method: 'POST',
        headers: {
            Authorization: authCode,
            "Content-Type": 'application/json',
        },
        body: JSON.stringify(data)
    };

    fetch(url, options)
    .then( (res:any) => res.json())
    .then( (data:any) => {
    })
    .catch((error:Error) => {
        console.log("error", error)
    })
}

//APPLE

export function addPlaylistToLibraryApple (playlist: UniversalPlaylist, userToken: string): any{
    return new Promise (function(resolve, reject){
        getAppleToken()
        .then((appleToken:string) =>{
            const url = 'https://api.music.apple.com/v1/me/library/playlists'

            var trackDataArray  = Array<any>()
            for (let track of playlist.tracks){
                let trackData = {
                    "id": track.appleId,
                    "type":"songs"
                }
                trackDataArray.push(trackData)
            }
            let data = {
                "attributes":{
                   "name":playlist.name,
                   "description":playlist.description
                },
                "relationships":{
                   "tracks":{
                      "data": trackDataArray
                   }
                }
            }
    
            const options = {
                method: 'POST',
                headers: {
                    'Music-User-Token': userToken,
                    Authorization: `Bearer ${appleToken}`,
                    "Content-Type": 'application/json',
                },
                body: JSON.stringify(data)
            };
        
            fetch(url, options)
            .then( (data:any) => {
                resolve()
            })
            .catch((error:Error) => {
                console.log("error", error)
                reject()
            })
        })
        .catch(() =>{
            reject("Error: could not get apple token")
        })
    })

}

