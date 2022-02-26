<template>
  <section>
    <header>
      <!-- header slot -->
      <slot name="header">
        <th>title</th>
      </slot>
    </header>
    <div class="main">
      <!-- default slot -->
      <slot> </slot>
    </div>
    <footer>
      <!-- footer slot -->
      <slot name="footer"> </slot>
    </footer>
  </section>
</template>

<script>
// 这里是组件的描述
export default {
  name: 'MyComponent',
  props: {
    // 用户名称
    userName: {
      type: [String, Number],
    },
    // 用户名称
    userAge: {
      type: Number,
    },
  },
  data() {
    return {
      // 用户信息
      userInfo: '',
      // 管理员信息
      adminInfo: '',
    }
  },
  methods: {
    // 更新用户信息
    updateUserInfo() {
      this.$emit('test')
      // todo
    },
    // 删除用户信息
    deleteUser() {
      // todo
    },
  },
}
</script>