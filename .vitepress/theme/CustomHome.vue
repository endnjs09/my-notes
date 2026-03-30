<script setup>
import { data as posts } from './posts.data.ts'
</script>

<template>
  <div class="custom-home-container">
    <div class="hero-header">
      <h1 class="title">이것저것 끄적이는 공간</h1>
    </div>

    <!-- Featured Post Hero Card (가장 최신 글 1개) -->
    <a :href="posts[0]?.url || '#'" v-if="posts.length > 0" class="hero-card">
      <div class="hero-image">
        <!-- Mock gradient image container -->
        <div class="hero-gradient">
          <div class="hero-mock-ui">
            <span class="plus-icon">+</span>
            <span>최근에 업데이트 된 글입니다</span>
          </div>
        </div>
      </div>
      <div class="hero-content">
        <p class="post-date" v-if="posts[0].date">{{ posts[0].date }}</p>
        <h2 class="post-title">{{ posts[0].title }}</h2>
        <p class="post-excerpt" v-if="posts[0].excerpt">{{ posts[0].excerpt }}</p>
        <p class="post-category">{{ posts[0].category }}</p>
      </div>
    </a>

    <!-- List of recent posts (그 외 글들) -->
    <div class="posts-list" v-if="posts.length > 1">
      <a v-for="(post, index) in posts.slice(1)" :key="index" :href="post.url" class="post-item">
        <div class="post-item-left">
          <h3 class="item-title">{{ post.title }}</h3>
          <p class="item-category">{{ post.category }}</p>
        </div>
        <p class="item-date" v-if="post.date">{{ post.date }}</p>
      </a>
    </div>
  </div>
</template>

<style scoped>
.custom-home-container {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.hero-header {
  text-align: center;
  margin-top: 40px;
  margin-bottom: 50px;
}

.title {
  font-size: 2.2rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--vp-c-text-1);
  letter-spacing: -0.02em;
}

.subtitle {
  font-size: 1.1rem;
  color: var(--vp-c-text-2);
  font-weight: 400;
}

.hero-card {
  text-decoration: none !important;
  color: inherit !important;
  display: flex;
  flex-direction: column;
  margin-bottom: 60px;
  transition: opacity 0.2s ease;
}

.hero-card:hover {
  opacity: 0.9;
}

.hero-image {
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 24px;
}

.hero-gradient {
  width: 100%;
  padding-bottom: 50%; /* Aspect ratio handling */
  background: linear-gradient(135deg, #FF6B6B, #4ECDC4, #45B7D1);
  background-size: 200% 200%;
  position: relative;
}

.hero-mock-ui {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  padding: 12px 24px;
  border-radius: 30px;
  color: white; /* Always white due to gradient bg */
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.1rem;
  font-weight: 500;
  white-space: nowrap;
}

.plus-icon {
  font-size: 1.4rem;
  font-weight: 300;
}

.post-date, .item-date {
  font-size: 0.9rem;
  color: var(--vp-c-text-3);
  margin-bottom: 8px;
}

.post-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 12px;
  line-height: 1.3;
}

.post-excerpt {
  font-size: 1.1rem;
  color: var(--vp-c-text-2);
  margin-bottom: 12px;
  line-height: 1.5;
}

.post-category, .item-category {
  font-size: 0.9rem;
  color: var(--vp-c-text-3);
  font-weight: 500;
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 30px;
  margin-bottom: 60px;
}

.post-item {
  display: flex;
  justify-content: space-between;
  text-decoration: none !important;
  color: inherit !important;
  padding-bottom: 30px;
  border-bottom: 1px solid var(--vp-c-divider);
  transition: opacity 0.2s ease;
}

.post-item:nth-last-child(1) {
  border-bottom: none;
}

.post-item:hover {
  opacity: 0.7;
}

.item-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 8px;
}
</style>
