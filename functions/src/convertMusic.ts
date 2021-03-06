import {Spotify, Apple} from "./apiInterfaces"
import {SpotifyToken} from "./SpotifyTokenManager"
import {AppleTrack, SpotifyTrack, UniversalTrack} from "./musicObjects"
import {SpotifyAlbum, AppleAlbum, UniversalAlbum} from "./musicObjects"
import {ApplePlaylist, SpotifyPlaylist, UniversalPlaylist} from "./musicObjects"
import {storeUniversalTrack, storeUniversalAlbum} from "./firestoreManager"
import {searchSpotifyTrack, searchAppleTrack, searchSpotifyAlbum, searchAppleAlbum} from "./apiManager"
import {getSpotifyAlbum, getAppleAlbum, getSpotifyPlaylist, getApplePlaylist} from "./apiManager"
import {getAppleToken} from "./AppleTokenManager"

const fetch = require('cross-fetch')

//UNIVERSALS

export function spotifyTrackToUniversal (trackId: string, token: SpotifyToken): any {
    return new Promise (function(resolve, reject) {
        const url = `https://api.spotify.com/v1/tracks/${trackId}`
        const options = {
            headers: {
                Authorization: token.token
            }
        };
    
        fetch (url, options)
        .then( (res:any) => res.json())
        .then( (data:any) => {
            let parsedData = <Spotify.TrackAttributes> data
            let spotifyTrack = new SpotifyTrack(parsedData)

            searchAppleTrack(spotifyTrack.baseTrack())
            .then((appleTrack:AppleTrack) => {
                let universalTrack = new UniversalTrack(spotifyTrack, appleTrack)
                universalTrack.updateColor()
                .then(()=>{
                    storeUniversalTrack(universalTrack)
                    resolve(universalTrack)
                })
            }).catch((error:Error) =>{
                console.log(error)
                reject(error)
            })
        }).catch((error:Error) => {
            console.log(error)
            reject(error)
        });
    })
}

export function appleTrackToUniversal (trackId: string, token: SpotifyToken):any {
    return new Promise(function(resolve, reject) {
        getAppleToken()
        .then((appleToken:string) =>{
            const url = `https://api.music.apple.com/v1/catalog/us/songs/${trackId}`
            const options = {
                headers: {
                    Authorization: `Bearer ${appleToken}`
                }
            };
            
            fetch (url, options)
            .then( (res:any) => res.json())
            .then( (data:any) => {
                let parsedResponse = <Apple.Tracks>data
                let appleTrack = new AppleTrack(parsedResponse.data[0])
    
                searchSpotifyTrack(appleTrack.baseTrack(), token)
                .then((spotifyTrack:SpotifyTrack) =>{
                    let universalTrack = new UniversalTrack(spotifyTrack, appleTrack)
                    storeUniversalTrack(universalTrack)
                    universalTrack.updateColor()
                    .then(()=>{
                        resolve(universalTrack)
                    })
                }).catch((error:Error) =>{
                    reject(error)
                })
            }).catch((error:Error) => {
                console.log(error)
                reject(error)
            });
        })
        .catch(() =>{
            reject("Error: could not get apple token")
        })
    })
}

export function spotifyAlbumToUniversal (albumId: string, token: SpotifyToken):any{
    return new Promise (function(resolve, reject) {
        getSpotifyAlbum(albumId, token)
        .then((spotifyAlbum:SpotifyAlbum) =>{
            searchAppleAlbum(spotifyAlbum.baseAlbum())
            .then((appleAlbum:AppleAlbum)=>{
                let universalAlbum = new UniversalAlbum(spotifyAlbum, appleAlbum)
                universalAlbum.updateColor()
                .then(()=>{
                    console.log(universalAlbum)
                    storeUniversalAlbum(universalAlbum)
                    resolve(universalAlbum)
                })
                
            })
            .catch((error:any)=>{
                console.log(error)
            })
        })
        .catch((error:Error)=>{
            console.log(error)
            reject(error)     
        })
    })
}

export function appleAlbumToUniversal (albumId: string, token: SpotifyToken):any{
    return new Promise (function(resolve, reject) {
        getAppleAlbum(albumId)
        .then((appleAlbum:AppleAlbum)=>{
            searchSpotifyAlbum(appleAlbum.baseAlbum(), token)
            .then((spotifyAlbum: SpotifyAlbum)=>{
                let universalAlbum = new UniversalAlbum(spotifyAlbum, appleAlbum)
                universalAlbum.updateColor()
                .then(()=>{
                    storeUniversalAlbum(universalAlbum)
                    resolve(universalAlbum)
                })
                
            })
            .catch((error:any)=>{
                console.log(error)
            })
        })
        .catch((error:Error)=>{
            reject(error)     
        })
    })
}

export function spotifyPlaylistToUniversal (playlistId: string, token: SpotifyToken): any {
    return new Promise (function(resolve, reject) {
        getSpotifyPlaylist(playlistId, token)
        .then((playlist: SpotifyPlaylist) =>{
            var fullfilledPromises:number = 0
            let goalPromises = playlist.tracks.length
            var universalTracks = new Array<UniversalTrack>()
            for (const [index, spotifyTrack] of playlist.tracks.entries()){
                setTimeout(function(){
                    searchAppleTrack(spotifyTrack.baseTrack())
                    .then((appleTrack:AppleTrack) => {
                        let universalTrack = new UniversalTrack(spotifyTrack, appleTrack)
                        universalTrack.updateColor()
                        .then(()=>{
                            storeUniversalTrack(universalTrack)
                        })

                        if (universalTracks.length > index){
                            universalTracks.splice(index, 0, universalTrack)
                        } else {
                            universalTracks.push(universalTrack)
                        }
                        fullfilledPromises += 1
                        if (fullfilledPromises == goalPromises){
                            let universalPlaylist = new UniversalPlaylist(playlist, universalTracks)
                            universalPlaylist.updateColor()
                            .then(()=>{
                                resolve(universalPlaylist)
                            })
                        }
                    })
                    .catch( (error:Error) => {
                        fullfilledPromises += 1
                        if (fullfilledPromises == goalPromises){
                            let universalPlaylist = new UniversalPlaylist(playlist, universalTracks)
                            universalPlaylist.updateColor()
                            .then(()=>{
                                resolve(universalPlaylist)
                            })
                        }
                    })
                }, (100 * index));
            }
        })
        .catch((error:Error) =>{
            reject(error)
        })
    })
}

export function applePlaylistToUniversal (playlistId: string, token: SpotifyToken): any {
    return new Promise (function(resolve, reject) {
        var universalTracks = new Array<UniversalTrack>()
        getApplePlaylist(playlistId)
        .then((playlist: ApplePlaylist) =>{

            var fullfilledPromises:number = 0
            let goalPromises = playlist.tracks.length

            for (let appleTrack of playlist.tracks){
                searchSpotifyTrack(appleTrack.baseTrack(), token)
                .then((spotifyTrack:SpotifyTrack) => {
                    let universalTrack = new UniversalTrack(spotifyTrack, appleTrack)
                    universalTrack.updateColor()
                    .then(()=>{
                        storeUniversalTrack(universalTrack)
                    })
                    universalTracks.push(universalTrack)
                    fullfilledPromises += 1
                    if (fullfilledPromises == goalPromises){
                        let universalPlaylist = new UniversalPlaylist(playlist, universalTracks)
                        universalPlaylist.updateColor()
                        .then(()=>{
                            resolve(universalPlaylist)
                        })
                    }
                })
                .catch( (error:Error) => {
                    fullfilledPromises += 1
                    if (fullfilledPromises == goalPromises){
                        let universalPlaylist = new UniversalPlaylist(playlist, universalTracks)
                        universalPlaylist.updateColor()
                        .then(()=>{
                            resolve(universalPlaylist)
                        })
                    }
                })
                
            }
        })
        .catch((error:Error) =>{
            reject(error)
        })
    })
}