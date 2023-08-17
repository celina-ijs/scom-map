import {
  Module,
  customModule,
  ControlElement,
  customElements,
  Container,
  Form,
  Input,
  Panel
} from '@ijstech/components'
import './index.css'
import { IData, ISearchPlacesData, ViewModeType } from '../interface';
import { DEFAULT_LAT, DEFAULT_LONG, DEFAULT_VIEW_MODE, DEFAULT_ZOOM, getPropertiesSchema, getUrl } from '../utils';
import { getAPIKey } from '../store';

interface ScomImageConfigElement extends ControlElement {
  long?: number;
  lat?: number;
  viewMode?: ViewModeType;
  zoom?: number;
  address?: string;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ["i-scom-map-config"]: ScomImageConfigElement;
    }
  }
}

declare global {
  interface Window {
    initMap: () => void;
  }
}

declare var google: any

@customModule
@customElements('i-scom-map-config')
export default class ScomMapConfig extends Module {
  private formEl: Form
  // private iframeMap: Iframe
  private mapElm: any // google.maps.Map
  private mapWrapper: Panel
  private latInput: Input
  private longInput: Input

  private _data: IData
  // private markers: any[] = []
  // private circles: any[] = []
  // private positions: any[] = []
  // private searchPlacesData: ISearchPlacesData
  private geocoder: any
  private placeService: any // google.maps.places.PlacesService
  private infowindow: any // google.maps.InfoWindow
  private searchTimer: any = null

  constructor(parent?: Container, options?: any) {
    super(parent, options)
    this.onInputChanged = this.onInputChanged.bind(this)
    this.googleMapsCallback = this.googleMapsCallback.bind(this)
  }

  get data() {
    return this._data
  }
  set data(value: IData) {
    this._data = value
    this.renderUI()
  }

  async updateData() {
    this._data = await this.formEl.getFormData()
  }

  iniGoogleMap() {
    this.geocoder = new google['maps']['Geocoder']()
    this.infowindow = new google['maps']['InfoWindow']()
    const lat = this.data?.lat || 22.396428
    const long = this.data?.long || 114.10949700000003
    const myOptions = {
      center: new google['maps']['LatLng'](lat, long),
      zoom: this.data.zoom,
      mapTypeId: this.data.viewMode
    }
    this.mapElm = new google['maps']['Map'](this.mapWrapper, myOptions)
    if (this.data.address) this.findPlace(this.data.address)
    this.updateAlignment()
  }

  private updateMap(data: IData) {
    const { viewMode, zoom, address, apiKey } = data
    if (apiKey !== apiKey) {}
    if (zoom !== this.data.zoom) this.mapElm.setZoom(zoom)
    if (address !== this.data.address) this.findPlace(address)
    if (viewMode !== this.data.viewMode) this.mapElm.setMapTypeId(viewMode)
  }

  private panTo(lat: number, lng: number) {
    if (!this.mapElm) return
    this.mapElm['panTo'](this.createLatLng(lat, lng))
  }

  private createLatLng(lat: number, lng: number) {
    return new google['maps']['LatLng'](lat, lng)
  }

  private locate(value: string, callback?: any) {
    this.data.address = value
    if (this.mapElm) {
      const self = this
      this.getLocation(value, function (latlng: any) {
        if (latlng) {
          self.mapElm['panTo'](latlng)
          if (callback) callback(latlng)
        } else if (callback) callback(undefined)
      })
    }
  }

  private findPlace(query: string) {
    const request = {
      query,
      fields: ['name', 'geometry'],
    }
    if (!this.placeService)
      this.placeService = new google['maps']['places']['PlacesService'](this.mapElm)
    this.placeService.findPlaceFromQuery(request, (results, status) => {
      if (status === google['maps']['places']['PlacesServiceStatus'].OK && results) {
        for (let i = 0; i < results.length; i++) {
          this.createMarker(results[i])
        }
        this.mapElm.setCenter(results[0].geometry.location)
        if (results[0]?.geometry?.location) {
          const lat = results[0].geometry.location.lat()
          const long = results[0].geometry.location.lng()
          this.latInput.value = lat
          this.longInput.value = long
          this.panTo(lat, long)
        }
      }
    })
  }

  private createMarker(place: any) { // google['maps']['places']['PlaceResult']
    const self = this
    if (!place.geometry || !place.geometry.location) return
    const marker = new google['maps']['Marker']({
      map: this.mapElm,
      position: place.geometry.location,
    })

    google['maps']['event'].addListener(marker, 'click', () => {
      self.infowindow.setContent(place.name || '')
      self.infowindow.open(self.mapElm)
    })
  }

  private getLocation(value: string, callback: any) {
    if (this.mapElm) {
      this.geocoder['geocode']({ address: value }, function (results, status) {
        if (status == google['maps']['GeocoderStatus']['OK']) {
          const latlng = results[0]['geometry']['location']
          const point = {
            lat: latlng['lat'](),
            lng: latlng['lng'](),
          }
          if (callback) callback(point)
        } else if (callback) callback(undefined)
      })
    } else if (callback) callback(undefined)
  }

  private updateAlignment() {
    if (this.mapElm) google['maps']['event']['trigger'](this.mapElm, 'resize')
  }

  // searchPlaces(searchData: any) {
  //   const { lat, lng, radius, keyword, callback } = searchData
  //   if (this.geocoder) {
  //     let latlng = this.createLatLng(lat, lng);
  //     let request = {
  //       location: latlng,
  //       rankBy: google['maps']['places']['RankBy']['DISTANCE'],
  //       radius: radius,
  //       keyword: keyword,
  //     }
  //     let self = this
  //     if (!this.placeService)
  //       this.placeService = new google['maps']['places']['PlacesService'](
  //         this.mapElm
  //       )
  //     this.placeService.search(request, function (result: any, status: any) {
  //       if (status == google['maps']['places']['PlacesServiceStatus']['OK']) {
  //         console.log('result: ', result)
  //         for (let i = 0; i < result.length; i++) {
  //           let item = result[i]
  //           let lat2 = item['geometry']['location']['lat']()
  //           let lng2 = item['geometry']['location']['lng']()
  //           item['distance'] = self.getDistance(lat, lng, lat2, lng2)
  //         }
  //         callback(result)
  //       } else callback(undefined)
  //     })
  //   } else {
  //     this.searchPlacesData = {
  //       lat: lat,
  //       lng: lng,
  //       radius: radius,
  //       keyword: keyword,
  //       callback: callback,
  //     }
  //   }
  // }

  getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
    function deg2rad(deg: number) {
      return deg * (Math.PI / 180)
    }
    let R = 6371 // Radius of the earth in km
    let dLat = deg2rad(lat2 - lat1) // deg2rad below
    let dLng = deg2rad(lng2 - lng1)
    let a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    let d = R * c // Distance in km
    return Math.round(d * 1000)
  }

  private initScript() {
    const oldScript = document.head.querySelector(`[name="googleMapScript"]`)
    if (oldScript) {
      this.googleMapsCallback()
      return
    }
    const apiKey = getAPIKey()
    const src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=3&callback=initMap&libraries=places`
    const script = document.createElement('script')
    script.setAttribute('async', 'true')
    script.setAttribute('name', 'googleMapScript')
    script.src = src
    document.head.appendChild(script)
    window.initMap = this.googleMapsCallback
  }

  private googleMapsCallback() {
    this.mapElm = undefined
    this.iniGoogleMap()
  }

  private renderUI() {
    this.formEl.clearInnerHTML()
    this.formEl.jsonSchema = getPropertiesSchema()
    this.formEl.formOptions = {
      columnWidth: '100%',
      columnsPerRow: 2,
      confirmButtonOptions: {
        hide: true,
      },
    }
    this.formEl.renderForm()
    this.formEl.clearFormData()
    this.formEl.setFormData(this._data)

    // const url = getUrl({ ...this._data })
    // this.iframeMap.url = url

    const inputs = this.formEl.querySelectorAll('[scope]')
    for (let input of inputs) {
      const inputEl = input as Input
      const scope: string = inputEl.getAttribute('scope', true, '')
      if (scope.includes('lat')) {
        this.latInput = inputEl
        inputEl.readOnly = true
      } else if (scope.includes('long')) {
        this.longInput = inputEl
        inputEl.readOnly = true
      } else {
        inputEl.onChanged = this.onInputChanged
      }
    }
  }

  private onInputChanged() {
    if (this.searchTimer) clearTimeout(this.searchTimer)
    this.searchTimer = setTimeout(async () => {
      const data = await this.formEl.getFormData()
      // const url = getUrl({ ...data })
      // this.iframeMap.url = url
      this.updateMap(data)
    }, 500)
  }

  disconnectCallback(): void {
    super.disconnectCallback()
    if (this.searchTimer) clearTimeout(this.searchTimer)
  }

  async init() {
    super.init()
    const long = this.getAttribute('long', true, DEFAULT_LONG)
    const lat = this.getAttribute('lat', true, DEFAULT_LAT)
    const viewMode = this.getAttribute('viewMode', true, DEFAULT_VIEW_MODE)
    const zoom = this.getAttribute('zoom', true, DEFAULT_ZOOM)
    const address = this.getAttribute('address', true, '')
    this.data = { long, lat, viewMode, zoom, address }
    this.initScript()
  }

  render() {
    return (
      <i-panel>
        <i-vstack gap='0.5rem'>
          <i-panel id='pnlForm'>
            <i-form id='formEl'></i-form>
          </i-panel>
          <i-panel id='mapWrapper' minHeight={500}></i-panel>
          {/* <i-panel>
            <i-iframe id='iframeMap' width='100%' height={500} display='flex' />
          </i-panel> */}
        </i-vstack>
      </i-panel>
    )
  }
}
