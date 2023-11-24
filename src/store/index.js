import Vue from 'vue'
import Vuex from 'vuex'
import gasApi from '../api/gasApi'

Vue.use(Vuex)

/** 
 * State
 * Vuexの状態
 */
const state = {
  /** 家計簿データ */
  abData: {},

  /** ローディング状態 */
  loading: {
    fetch: false,
    add: false,
    update: false,
    delete: false
  },

  /** エラーメッセージ */
  errorMessage: '',

  /** 設定 */
  settings: {
    appName: '💰okanekanrineko🐈',
    apiUrl: '',
    authToken: '',
    strIncomeItems: '給料, ボーナス, 繰越',
    strOutgoItems: '食費, 移動費, 入場料, 宿泊費, 雑費',
    strTagItems: 'なおくん, ゆりねこ, ゆりねこ→なおくん, なおくん→ゆりねこ'
  }
}

/**
 * Mutations
 * ActionsからStateを更新するときに呼ばれます
 */
const mutations = {
  /** 指定年月の家計簿データをセットします */
  setAbData(state, { yearMonth, list }) {
    state.abData[yearMonth] = list
  },

  /** データを追加します */
  addAbData(state, { item }) {
    const yearMonth = item.date.slice(0, 7)
    const list = state.abData[yearMonth]
    if (list) {
      list.push(item)
    }
  },

  /** 指定年月のデータを更新します */
  updateAbData(state, { yearMonth, item }) {
    const list = state.abData[yearMonth]
    if (list) {
      const index = list.findIndex(v => v.id === item.id)
      list.splice(index, 1, item)
    }
  },

  /** 指定年月&IDのデータを削除します */
  deleteAbData(state, { yearMonth, id }) {
    const list = state.abData[yearMonth]
    if (list) {
      const index = list.findIndex(v => v.id === id)
      list.splice(index, 1)
    }
  },

  /** ローディング状態をセットします */
  setLoading(state, { type, v }) {
    state.loading[type] = v
  },

  /** エラーメッセージをセットします */
  setErrorMessage(state, { message }) {
    state.errorMessage = message
  },

  /** 設定を保存します */
  saveSettings(state, { settings }) {
    state.settings = { ...settings }
    const { appName, apiUrl, authToken } = state.settings
    document.title = appName
    gasApi.setUrl(apiUrl)
    gasApi.setAuthToken(authToken)
    state.abData = {}

    localStorage.setItem('settings', JSON.stringify(settings))
  },

  /** 設定を読み込みます */
  loadSettings(state) {
    const settings = JSON.parse(localStorage.getItem('settings'))
    if (settings) {
      state.settings = Object.assign(state.settings, settings)
    }
    const { appName, apiUrl, authToken } = state.settings
    document.title = appName
    gasApi.setUrl(apiUrl)
    gasApi.setAuthToken(authToken)
  }
}

/**
 * Actions
 * 画面から呼ばれ、Mutationをコミットします
 */
const actions = {
  /** 指定年月の家計簿データを取得します */
  async fetchAbData({ commit }, { yearMonth }) {
    const type = 'fetch'
    commit('setLoading', { type, v: true })
    try {
      const res = await gasApi.fetch(yearMonth)
      commit('setAbData', { yearMonth, list: res.data })
    } catch (e) {
      commit('setErrorMessage', { message: e })
      commit('setAbData', { yearMonth, list: [] })
    } finally {
      commit('setLoading', { type, v: false })
    }
  },

  /** データを追加します */
  async addAbData({ commit }, { item }) {
    const type = 'add'
    commit('setLoading', { type, v: true })
    try {
      const res = await gasApi.add(item)
      commit('addAbData', { item: res.data })
    } catch (e) {
      commit('setErrorMessage', { message: e })
    } finally {
      commit('setLoading', { type, v: false })
    }
  },

  /** データを更新します */
  async updateAbData({ commit }, { beforeYM, item }) {
    const type = 'update'
    const yearMonth = item.date.slice(0, 7)
    commit('setLoading', { type, v: true })
    try {
      const res = await gasApi.update(beforeYM, item)
      if (yearMonth === beforeYM) {
        commit('updateAbData', { yearMonth, item })
        return
      }
      const id = item.id
      commit('deleteAbData', { yearMonth: beforeYM, id })
      commit('addAbData', { item: res.data })
    } catch (e) {
      commit('setErrorMessage', { message: e })
    } finally {
      commit('setLoading', { type, v: false })
    }
  },

  /** データを削除します */
  async deleteAbData({ commit }, { item }) {
    const type = 'delete'
    const yearMonth = item.date.slice(0, 7)
    const id = item.id
    commit('setLoading', { type, v: true })
    try {
      await gasApi.delete(yearMonth, id)
      commit('deleteAbData', { yearMonth, id })
    } catch (e) {
      commit('setErrorMessage', { message: e })
    } finally {
      commit('setLoading', { type, v: false })
    }
  },

  /** 設定を保存します */
  saveSettings({ commit }, { settings }) {
    commit('saveSettings', { settings })
  },

  /** 設定を読み込みます */
  loadSettings({ commit }) {
    commit('loadSettings')
  }
}

/** カンマ区切りの文字をトリミングして配列にします */
const createItems = v => v.split(',').map(v => v.trim()).filter(v => v.length !== 0)

/**
 * Getters
 * 画面から取得され、Stateを加工して渡します
 */
const getters = {
  /** 収入カテゴリ（配列） */
  incomeItems(state) {
    return createItems(state.settings.strIncomeItems)
  },
  /** 支出カテゴリ（配列） */
  outgoItems(state) {
    return createItems(state.settings.strOutgoItems)
  },
  /** タグ（配列） */
  tagItems(state) {
    return createItems(state.settings.strTagItems)
  }
}

const store = new Vuex.Store({
  state,
  mutations,
  actions,
  getters
})

export default store