<template>
  <div class="example">
    <introduction description="The size of each item is equal." />
    <div class="example-content">
      <tab v-on:tab-change="onTabChange" />
      <div v-show="isShowView">
        <virtual-list class="list scroll-touch"
          data-key="id"
          :data-sources="items"
          :estimateSize="40">
          <h1 slot="header">固定高度</h1>
          <template v-slot:item="{ source }">
            <Item :source="source" class="list-item-fixed" />
          </template>
        </virtual-list>
      </div>
      <codeblock v-show="!isShowView" />
    </div>
  </div>
</template>

<script>
import Item from './Item';
import Code from './Code';

import { Random } from '../../common/mock';
import genUniqueId from '../../common/gen-unique-id';
import { TAB_TYPE, DEFAULT_TAB } from '../../common/const';

const TOTAL_COUNT = 500;

const DataItems = [];
let count = TOTAL_COUNT;
while (count--) {
  const index = TOTAL_COUNT - count;
  DataItems.push({
    index,
    name: Random.name(),
    id: genUniqueId(index),
  });
}

export default {
  name: 'fix-size',
  components: { codeblock: Code, Item },
  data() {
    return {
      total: TOTAL_COUNT.toLocaleString(),
      items: DataItems,
      itemComponent: Item,
      isShowView: DEFAULT_TAB === TAB_TYPE.VIEW,
    };
  },

  methods: {
    onTabChange(type) {
      this.isShowView = type === TAB_TYPE.VIEW;
    },
  },
};
</script>

<style lang="less">
.list {
  width: 100%;
  height: 500px;
  border: 2px solid;
  border-radius: 3px;
  overflow-y: auto;
  border-color: dimgray;

  .list-item-fixed {
    display: flex;
    align-items: center;
    padding: 0 1em;
    height: 60px;
    border-bottom: 1px solid;
    border-color: lightgray;
  }
}
</style>
