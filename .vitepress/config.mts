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
    nav: [
      { text: 'Home', link: '/' },
      {
        text: 'Game', // 상단에 표시될 이름
        items: [      // 클릭 시 아래로 떨어질 박스 내용
          { text: '원카드 🃏', link: '/onecard.html', target: '_blank' }, 
          { text: '포커 ♠️', link: '/poker.html', target: '_blank' },
          { text: '오목 ⚪', link: '/omok/index.html', target: '_blank' }
        ]
      },
    ], 


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
                { text: '1-1. 개요 및 개념', link: '/src/DL/Chapter-01/1-1. 머신러닝 기초' },
                { text: '1-2. 학습 모델 분류', link: '/src/DL/Chapter-01/1-2. 지도, 비지도 학습' },
              ]
            },
            {
              text: 'Chapter-02. 기초 지식',
              collapsed: true,
              items: [
                { text: '2-1. 텐서 기초', link: '/src/DL/Chapter-02/2-1. Data Manipulation' },
                { text: '2-2. 선형대수', link: '/src/DL/Chapter-02/2-2. Linear Algebra' },
                { text: '2-3. 미분', link: '/src/DL/Chapter-02/2-3. Caculus' },
                { text: '2-4. 자동 미분', link: '/src/DL/Chapter-02/2-4. Automatic Differentiation' },
                { text: '2-5. 확률과 통계', link: '/src/DL/Chapter-02/2-5.  Probability and Statistics' },
              ]
            },
            {
              text: 'Chapter-03. LNN(Regression)',
              collapsed: true,
              items: [
                { text: '3-1. 선형 회귀', link: '/src/DL/Chapter-03/3-1. Linear Regression' },
                { text: '3-2. 손실함수', link: '/srcDL/Chapter-03/3-2. Loss function' },
                { text: '3-3. 경사하강법', link: '/src/DL/Chapter-03/3-3. Gradient Descent' },
                { text: '3-4. 모델링, 학습', link: '/src/DL/Chapter-03/3-4. Modeling' },
                { text: '3-5. 일반화', link: '/src/DL/Chapter-03/3-5. Generalization' },
                { text: '3-6. 가중치 감쇠', link: '/src/DL/Chapter-03/3-6. Weight Decay' },
              ]
            },
            {
              text: 'Chapter-04. LNN(Classification)',
              collapsed: true,
              items: [
                { text: '4-1. Softmax 회귀', link: '/src/DL/Chapter-04/4-1. SoftMax Regression' },
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
        },
        {
          text: '네트워크 (Network)',
          collapsed: false,
          items: [
            {
              text: 'Chapter-01. Network Protocol',
              collapsed: false,
              items: [
                { text: '1-1. 기본 개념', link: '/src/1_Network/protocol' },
                { text: '1-2. 기초 소켓 프로그래밍', link: '/src/DL/1_Network/socket' },
                { text: '1-3. 예제', link: '/src/DL/1_Network/calc' },
              ]
            },
            {
              text: 'Chapter-02. Process',
              collapsed: false,
              items: [
                { text: '2-1. 기본 개념', link: '/src/1_Network/protocol' },
                { text: '2-2. 예제', link: '/src/DL/1_Network/talkserv' },
              ]
            },
            {
              text: '부록',
              collapsed: false,
              items: [
                { text: '함수 원형들', link: '/src/DL/1_Network/function' },
              ]
            },
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
