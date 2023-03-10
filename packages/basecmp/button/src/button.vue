<template>
  <div
    :class="[
      'c-btn-kw',
      sizeMap[size],
      round && 'round',
      plain && 'plain',
      !width && 'm-w-92',
      colorMap[color],
      disable && 'disable',
      loading && 'loading',
      noBorder && 'noBorder',
      active && 'active',
      !bold && 'regular',
    ]"
    :style="{ width: `${Number(width)}px` }"
    @click="handleClick"
  >
    <div :class="['btn-content', reverse && 'reverse']">
      <slot name="icon">
        <i v-show="icon || loading" :class="[getLoadingClass, 'btn-icon-al']"></i>
      </slot>
      <p class="btn-txt-kj"><slot></slot></p>
    </div>
  </div>
</template>

<script>
const sizeMap = {
  large: 'large',
  l: 'large',
  medium: 'medium',
  m: 'medium',
  small: 'small',
  s: 'small',
};
const colorMap = {
  normal: 'normal',
  blue: '_blue', // blue类有污染这里使用_blue
  red: 'red',
  green: 'green',
  white: 'white',
};

export default {
  name: 'SdpButton',
  props: {
    /**
     * 按钮尺寸 large(l) | medium(m) | small(s)
     */
    size: {
      type: String,
      default: 'medium',
      validator(val) {
        return Object.keys(sizeMap).includes(val);
      },
    },
    /** 大圆角 */
    round: {
      type: Boolean,
      default: true,
    },
    noBorder: {
      type: Boolean,
      default: false,
    },
    /** 朴素按钮 */
    plain: Boolean,
    /**
     * 按钮颜色 normal | blue | red | green
     */
    color: {
      type: String,
      default: 'blue',
      validator(val) {
        return Object.keys(colorMap).includes(val);
      },
    },
    /** icon class name */
    icon: {
      type: String,
      default: '',
    },
    disable: Boolean,
    /**
     * 是否开启 hover active 样式
     */
    active: {
      type: Boolean,
      default: true,
    },
    loading: Boolean,
    loadingClass: String,
    width: String,
    reverse: Boolean,
    bold: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      sizeMap,
      colorMap,
    };
  },
  methods: {
    handleClick(evt) {
      if (this.disable || this.loading) {
        return false;
      }
      this.$emit('click', evt);
    },
  },
  computed: {
    getLoadingClass() {
      if (this.loading) {
        // loadingClass优先
        if (this.loadingClass) {
          return `${this.loadingClass} active`;
        }
        // 朴素按钮显示黑色的圆圈
        return this.plain ? 'icon_loading_black active' : 'icon_loading_white active';
      }
      return this.icon;
    },
  },
};
</script>

<style lang="less">
.c-btn-kw {
  display: inline-block;
  padding: 0 15px; // 加上边框共16px
  text-align: center;
  outline: none;
  cursor: pointer;
  text-indent: 0;
  border-radius: 4px;
  opacity: 1;
  transition: opacity 0.25s ease-out;
  user-select: none;
  overflow: hidden;
  font-weight: normal;
  &.noBorder {
    border: none !important;
  }
  &.regular {
    font-weight: normal !important;
  }
  .icon_link_to {
    margin-left: 3px;
  }
  /** size */
  &.large {
    height: 40px;
    line-height: 40px;
    font-size: 14px;
    font-weight: bold;
    .btn-icon-al {
      width: 16px;
      height: 16px;
    }
  }
  &.m-w-92 {
    min-width: 92px;
  }
  &.medium {
    height: 32px;
    line-height: 30px;
    font-size: 14px;
    font-weight: bold;
    .btn-icon-al {
      width: 16px;
      height: 16px;
    }
  }
  &.small {
    min-width: 58px;
    height: 24px;
    line-height: 22px;
    font-size: 12px;
    font-weight: normal;
    .btn-icon-al {
      width: 14px;
      height: 14px;
    }
  }

  /** round */
  &.round {
    border-radius: 20px;
  }

  /** plain */
  &.plain {
    background: #fff !important;
    .btn-icon-al,
    svg {
      margin: 0 6px 0 0 !important;
    }
  }

  /** color */
  &.normal {
    color: #06003b;
    border: 1px solid #dcdfe6;
    background: #fff;
    .btn-icon-al,
    svg {
      margin: 0 6px 0 0 !important;
    }
  }
  &._blue {
    color: #fff;
    border: 1px solid #3A51E0;
    background: #3A51E0;
    &.plain {
      color: #3A51E0;
    }
  }
  &.red {
    color: #fff;
    border: 1px solid #f56c6c;
    background: #f56c6c;
    &.plain {
      color: #f56c6c;
    }
  }
  &.green {
    color: #fff;
    border: 1px solid #67c23a;
    background: #67c23a;
    &.plain {
      color: #67c23a;
    }
  }
  &.white {
    color: #fff;
    border: 1px solid #fff;
    background: none;
    &.plain {
      color: #fff;
      background: none !important;
    }
  }

  &.active {
    &:hover,
    &:active {
      opacity: 0.7;
    }
  }

  &.disable {
    cursor: not-allowed;
    background: #f5f7fa;
    color: #b5bec5;
    border: 1px solid #f5f7fa;
    &:hover,
    &:active {
      opacity: 1;
    }
  }
  &.loading {
    cursor: not-allowed;
    opacity: 0.7;
    &:hover,
    &:active {
      opacity: 0.7;
    }
  }

  .btn-content {
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    height: 100%;
    &.reverse {
      flex-direction: row-reverse;
      .btn-icon-al,
      svg {
        margin: 0 0 0 8px;
      }
    }
    .btn-icon-al,
    svg {
      margin: 0 8px 0 0;
    }
    .btn-txt-kj {
      white-space: nowrap;
    }
  }
}
</style>
