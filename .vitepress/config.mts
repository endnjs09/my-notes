import { defineConfig } from 'vitepress'
import mathjax3 from 'markdown-it-mathjax3'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/my-notes/',
  title: "endnjs's Notes", // 사이트 제목
  description: "Insights for developers building with OpenAI",

  markdown: {
    config: (md) => {
      md.use(mathjax3)
    }
  },

  themeConfig: {
    logo: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png', // 깃허브 로고 아이콘
    nav: [], // 상단 네비게이션 비우기


    // 1. 왼쪽 사이드바 설정 (카테고리별 분리)
    sidebar: {
      // '/' 경로 (홈페이지)에서도 전체 카테고리 사이드바를 보여줍니다.
      '/': [
        {
          text: '딥러닝 (Deep Learning)',
          collapsed: false,
          items: [
            {
              text: 'Chapter-01. 머신러닝 기초',
              collapsed: false,
              items: [
                { text: '1-1. 개요 및 개념', link: '/Chapter-01/1-1. 머신러닝 기초' },
                { text: '1-2. 학습 모델 분류', link: '/Chapter-01/1-2. 지도, 비지도 학습' },
              ]
            },
            {
              text: 'Chapter-02. 데이터 조작',
              collapsed: true,
              items: [
                { text: '2-1. 텐서 기초 (준비중)', link: '/Chapter-02/tensor-basic' },
              ]
            }
          ]
        },
        {
          text: '자료구조 (Data Structure)',
          collapsed: false,
          items: [
            { text: 'Chapter-01. ', link: '/Data-Structure/intro' },
            { text: 'Chapter-02. ', link: '/Data-Structure/stack-queue' },
          ]
        }
      ]
    },

    // 2. 검색 기능 추가 (가장 단순하고 빠름)
    search: {
      provider: 'local'
    },

    // 3. 오른쪽 상단 깃허브 링크
    socialLinks: [
      { icon: 'github', link: 'https://github.com/endnjs09' }
    ],

    // 푸터 (옵션)
    footer: {
      message: 'Designed based on vitepress',
      copyright: 'Copyright © 2026'
    }
  }
})
